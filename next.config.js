// next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/proxy-chat',  // Use a different path to avoid conflicts
        destination: 'https://jennihomechatbot.onrender.com/api/chat',
      },
    ];
  },
};