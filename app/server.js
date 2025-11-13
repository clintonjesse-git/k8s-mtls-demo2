const http = require('http');
const port = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type':'text/plain'});
  const dn = req.headers['ssl-client-subject-dn'] || 'Unknown Client';
  res.end(`Hello from Demo2 over mTLS! Verified client: ${dn}\n`);
});
server.listen(port, () => console.log(`Demo2 app listening on ${port}`));
