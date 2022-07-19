const Net = require('node:net');

const statuses = require('./statuses.json');
const c = require('./config.json');

const client = Net.connect({"host": c.server.host, port: c.server.port});

client.on('connect', () => {
    console.log('Connection successful.');
});

client.on('data', (data) => {
    const dataStr = data.toString('utf-8');
    const status = parseInt(dataStr.split(' ')[0]);
    const msg = dataStr.slice(dataStr.split(' ')[0].length + 1);

    if(status != 334) console.log('Server:', status, dataStr.replace('\r\n', ''));

    switch (status) {
        case 220:
            write(`EHLO ${c.client.name}`);
            break;

        case 250:
            if(msg.includes('AUTH LOGIN PLAIN')) write('AUTH LOGIN');
            if(msg.includes('2.1.0')) write(`RCPT TO <${c.real.to}>`);
            if(msg.includes('2.1.5')) write(`DATA`);
            if(msg.includes('queued for delivery')) write('QUIT');
            break;

        case 334:
            let message64 = Buffer.from(msg, 'base64').toString('utf-8');
            console.log('[Base 64] Server:', status, message64);

            if(message64.includes('Username:')) write(Buffer.from(c.real.from).toString('base64'));
            if(message64.includes('Password:')) write(Buffer.from(c.real.password).toString('base64'), false);
            break;

        case 235:
            write(`MAIL FROM <${c.real.from}>`);
            break;

        case 354:
            let headers = `From: ${c.fake.from}\nTo: ${c.fake.for}\nSubject: ${c.message.subject}\nDate: ${new Date().toUTCString()}`;
            let body = c.message.body.toString();
            let message = `${headers}\n\n${body}\n\r\n.\r\n`;

            client.write(`${message}`);
            console.log(`Client: ${message}`);
            break;

        case 221:
            console.log('\nMAIL SENT.');
            break;
    
        default:
            if(statuses[status.toString()]) throw new Error(`Unhandled status ${status.toString()} - ${statuses[status.toString()]}`);
            else throw new Error(`Unhandled status ${status.toString()}`);
    }
});

function write(msg, log = true){
    client.write(`${msg}\r\n`);
    if(log) console.log(`Client: ${msg}`);
    else console.log('Client: [Output hidden]');
};