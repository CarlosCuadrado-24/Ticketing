const http = require('http');

// Configuration
const API_BASE = 'localhost:3000';
const EMAIL = 'ccuadradot@unicartagena.edu.co';
const PASSWORD = '13456789';

let TOKEN = '';
let EVENT_ID = '';
let ORDER_ID = '';

// Helper function to make HTTP requests
function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (body) {
      headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: `/api${path}`,
      method: method,
      headers: headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runPurchaseFlow() {
  try {
    console.log('🔐 Step 1: Login...');
    const loginResponse = await makeRequest('POST', '/auth/login', {
      email: EMAIL,
      password: PASSWORD
    });
    
    if (loginResponse.status !== 200 && loginResponse.status !== 201) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse)}`);
    }
    
    TOKEN = loginResponse.data.accessToken;
    console.log(`✅ Token obtained: ${TOKEN.substring(0, 50)}...`);

    console.log('\n🎫 Step 2: Get available events...');
    const eventsResponse = await makeRequest('GET', '/events');
    
    if (!eventsResponse.data || eventsResponse.data.length === 0) {
      throw new Error('No events available');
    }
    
    const event = eventsResponse.data[0];
    EVENT_ID = event.id;
    console.log(`✅ Event selected: ${event.name} (${EVENT_ID})`);
    console.log(`   Available tickets: ${JSON.stringify(event.ticketConfigurations)}`);

    console.log('\n🛒 Step 3: Purchase tickets...');
    const ticketTypeId = event.ticketConfigurations[0].type;
    const purchasePayload = {
      eventId: EVENT_ID,
      ticketType: ticketTypeId,
      quantity: 2,
      buyerEmail: EMAIL,
      paymentInfo: {
        cardNumber: '4111111111111111',
        expiryDate: '12/26',
        cvv: '123'
      }
    };
    
    console.log(`   Purchasing tickets with: ${JSON.stringify(purchasePayload, null, 2)}`);
    const purchaseResponse = await makeRequest('POST', '/tickets/purchase', purchasePayload, TOKEN);
    
    if (purchaseResponse.status !== 200 && purchaseResponse.status !== 201) {
      throw new Error(`Ticket purchase failed: ${JSON.stringify(purchaseResponse)}`);
    }
    
    console.log(`✅ Tickets purchased successfully!`);
    console.log(`   Purchase details: ${JSON.stringify(purchaseResponse.data, null, 2)}`);

    console.log('\n📧 Step 4: Check email logs...');
    console.log('   Check backend logs for email sending status');
    
    console.log('\n✅✅✅ PURCHASE FLOW COMPLETED SUCCESSFULLY! ✅✅✅');
    console.log(`\nSummary:`);
    console.log(`- Event ID: ${EVENT_ID}`);
    console.log(`- Tickets purchased: ${purchaseResponse.data.length || 'N/A'}`);
    console.log(`- Email: ${EMAIL}`);
    console.log(`\nCheck your email inbox (${EMAIL}) for confirmation email.`);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

runPurchaseFlow();
