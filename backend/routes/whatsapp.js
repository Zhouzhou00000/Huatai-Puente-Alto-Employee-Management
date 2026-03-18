const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper: get WhatsApp settings
async function getWASettings() {
  const { rows } = await db.query(
    "SELECT key, value FROM settings WHERE key IN ('wa_token', 'wa_phone_id')"
  );
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  return settings;
}

// Helper: format phone number for WhatsApp API
function formatPhone(phone) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('56') && digits.length >= 10) return digits;
  if (digits.startsWith('9') && digits.length === 9) digits = '56' + digits;
  return digits || null;
}

// Helper: call WhatsApp API
async function callWA(settings, body) {
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${settings.wa_phone_id}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.wa_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

// Helper: send a message (template first to open conversation, then text)
async function sendMessage(settings, phone, message) {
  // Try text message first
  let result = await callWA(settings, {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: { body: message },
  });

  if (result.ok) {
    return { success: true, messageId: result.data.messages?.[0]?.id };
  }

  // If text fails (no conversation window), send template to open window, then text
  const errCode = result.data.error?.code;
  // 131047 = Re-engagement message, 131049 = message outside window
  if (errCode === 131047 || errCode === 131049 || errCode === 131030) {
    // Send template to initiate conversation
    const tplResult = await callWA(settings, {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: { name: 'hello_world', language: { code: 'en_US' } },
    });

    if (!tplResult.ok) {
      return { success: false, error: tplResult.data.error?.message || 'Template send failed' };
    }

    // Wait a moment for the conversation window to open
    await new Promise(r => setTimeout(r, 1500));

    // Now send the actual text message
    result = await callWA(settings, {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: message },
    });

    if (result.ok) {
      return { success: true, messageId: result.data.messages?.[0]?.id };
    }
  }

  return { success: false, error: result.data.error?.message || 'Send failed' };
}

// Send single WhatsApp message
router.post('/send', async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: 'Phone and message are required' });
  }

  try {
    const settings = await getWASettings();
    if (!settings.wa_token || !settings.wa_phone_id) {
      return res.status(400).json({ error: 'WhatsApp API not configured' });
    }

    const formattedPhone = formatPhone(phone);
    if (!formattedPhone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const result = await sendMessage(settings, formattedPhone, message);
    if (result.success) {
      res.json({ success: true, messageId: result.messageId, phone: formattedPhone });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send batch WhatsApp messages
router.post('/send-batch', async (req, res) => {
  const { recipients } = req.body;
  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'Recipients array is required' });
  }

  try {
    const settings = await getWASettings();
    if (!settings.wa_token || !settings.wa_phone_id) {
      return res.status(400).json({ error: 'WhatsApp API not configured' });
    }

    const results = [];

    for (const r of recipients) {
      const formattedPhone = formatPhone(r.phone);
      if (!formattedPhone) {
        results.push({ employeeId: r.employeeId, name: r.employeeName, success: false, error: 'Invalid phone' });
        continue;
      }

      try {
        const result = await sendMessage(settings, formattedPhone, r.message);
        results.push({
          employeeId: r.employeeId,
          name: r.employeeName,
          success: result.success,
          messageId: result.messageId,
          error: result.error,
        });
      } catch (err) {
        results.push({
          employeeId: r.employeeId,
          name: r.employeeName,
          success: false,
          error: err.message,
        });
      }
    }

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    res.json({ sent, failed, total: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test connection
router.get('/test', async (req, res) => {
  try {
    const settings = await getWASettings();
    if (!settings.wa_token || !settings.wa_phone_id) {
      return res.json({ configured: false });
    }

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${settings.wa_phone_id}`,
      { headers: { 'Authorization': `Bearer ${settings.wa_token}` } }
    );
    const data = await response.json();

    if (response.ok) {
      res.json({
        configured: true,
        connected: true,
        phoneNumber: data.display_phone_number,
        name: data.verified_name,
      });
    } else {
      res.json({ configured: true, connected: false, error: data.error?.message });
    }
  } catch (err) {
    res.json({ configured: false, error: err.message });
  }
});

module.exports = router;
