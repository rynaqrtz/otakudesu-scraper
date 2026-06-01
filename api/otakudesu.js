const scraper = require('../scraper');

module.exports = async (req, res) => {
  const { type, q, id } = req.query;
  try {
    const result = await scraper(type || 'home', q || id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      creator: 'rynaqrtz',
    });
  }
};
