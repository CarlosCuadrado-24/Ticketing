const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generando certificados SSL con Node.js...');

try {
  // Generar un par de claves
  const keys = forge.pki.rsa.generateKeyPair(2048);

  // Crear certificado
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [{
    name: 'countryName',
    value: 'ES'
  }, {
    name: 'organizationName',
    value: 'Development'
  }, {
    name: 'commonName',
    value: 'localhost'
  }];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // Añadir extensiones para múltiples nombres
  cert.setExtensions([{
    name: 'basicConstraints',
    cA: false
  }, {
    name: 'keyUsage',
    keyCertSign: false,
    digitalSignature: true,
    nonRepudiation: false,
    keyEncipherment: true,
    dataEncipherment: false
  }, {
    name: 'subjectAltName',
    altNames: [{
      type: 2, // DNS
      value: 'localhost'
    }, {
      type: 7, // IP
      ip: '127.0.0.1'
    }]
  }]);

  // Autofirmar certificado
  cert.sign(keys.privateKey);

  // Convertir a PEM
  const certPem = forge.pki.certificateToPem(cert);
  const keyPem = forge.pki.privateKeyToPem(keys.privateKey);

  // Escribir archivos
  const sslDir = path.join(__dirname, '..', 'ssl');
  if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir, { recursive: true });
  }

  fs.writeFileSync(path.join(sslDir, 'cert.pem'), certPem);
  fs.writeFileSync(path.join(sslDir, 'key.pem'), keyPem);

  console.log('✅ Certificados generados exitosamente:');
  console.log('   - cert.pem (certificado)');
  console.log('');
  console.log('💡 Uso:');
  console.log('   npm run start:ssl');
  console.log('   https://localhost');
  console.log('');
  console.log('📱 Para móvil, usa tu IP local:');
  console.log('   https://[TU_IP]:4200');

} catch (error) {
  console.error('❌ Error generando certificados:', error.message);
  console.log('');
  console.log('🔧 Alternativas:');
  console.log('1. Instalar: npm install node-forge');
  console.log('2. O usar ngrok: npx ngrok http 4200');
}
