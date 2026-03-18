const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  const { text, from = 'zh-CN', to = 'es' } = req.body;
  if (!text || !text.trim()) return res.json({ translated: '' });

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.substring(0, 500))}&langpair=${from}|${to}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json({ translated: data.responseData.translatedText });
  } catch (err) {
    res.status(500).json({ error: 'Translation failed: ' + err.message });
  }
});

module.exports = router;
