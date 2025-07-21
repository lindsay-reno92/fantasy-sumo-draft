module.exports = (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Fantasy Sumo Draft API is running!',
    timestamp: new Date().toISOString()
  });
}; 