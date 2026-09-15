import { Controller, Get, Header } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Header('Content-Type', 'text/html')
  getFallback(): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>API Pista8</title>
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              background: #0B0F19; 
              color: #f1f5f9; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0; 
              text-align: center;
              padding: 20px;
            }
            h1 { color: #3b82f6; margin-bottom: 10px; }
            p { color: #94a3b8; line-height: 1.5; }
            .badge {
              display: inline-block;
              background: rgba(59, 130, 246, 0.2);
              color: #60a5fa;
              padding: 4px 12px;
              border-radius: 999px;
              font-size: 14px;
              font-weight: bold;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <h1>Pista8 API</h1>
          <p>Esta es la interfaz de programación de aplicaciones (API) para Pista8.<br/>El servidor está en línea y procesando solicitudes.</p>
          <div class="badge">Sistemas Operativos</div>
        </body>
      </html>
    `;
  }
}
