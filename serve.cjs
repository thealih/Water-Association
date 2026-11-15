// Optional local preview server. GitHub Pages does not run or need this file.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,port=Number(process.env.PORT||4175);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.md':'text/plain; charset=utf-8'};
const server=http.createServer((request,response)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);}catch{response.writeHead(400);return response.end('Bad request');}
  const filename=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!filename.startsWith(root+path.sep)){response.writeHead(403);return response.end('Forbidden');}
  fs.readFile(filename,(error,bytes)=>{
    if(error){response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return response.end('Not found');}
    response.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    response.end(request.method==='HEAD'?undefined:bytes);
  });
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Port '+port+' is busy. Set PORT to another number.':error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log('Homepage demo: http://127.0.0.1:'+port+' — Ctrl+C to stop.'));
