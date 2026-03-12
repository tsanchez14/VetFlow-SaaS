# VetFlow 🐾

Sistema de gestión integral para veterinarias.

## Estructura del Proyecto

```
VetFlow/
├── README.md           # Este archivo
├── package.json        # Dependencias y scripts
├── .env                # Variables de entorno (no versionado)
├── .gitignore
├── docs/               # Documentación del proyecto
├── .claude/            # Configuración de agentes AI
├── tools/              # Scripts de test y diagnóstico
└── src/                # Código fuente
    ├── server.js       # Servidor Express + API routes
    ├── supabase.js     # Configuración de Supabase
    ├── database.js     # Configuración de base de datos
    └── public/         # Frontend (HTML, CSS, JS)
        ├── index.html
        ├── css/
        ├── js/
        └── assets/
```

## Inicio Rápido

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Servidor disponible en http://localhost:3000
```

## Variables de Entorno

Crear un archivo `.env` en la raíz con:

```env
SUPABASE_URL=tu_url_de_supabase
SUPABASE_KEY=tu_key_de_supabase
PORT=3000
```

## Tech Stack

- **Backend:** Node.js + Express
- **Base de datos:** Supabase (PostgreSQL)
- **Frontend:** HTML, CSS, JavaScript vanilla
