const os = require('os');

function getServerIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName].find(details => details.family === 'IPv4' && !details.internal);
    if (iface) {
      return iface.address;
    }
  }
  return null;
}

module.exports = { getServerIPAddress };