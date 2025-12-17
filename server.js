require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

// --- NUEVO: Servir la página web ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
// -----------------------------------

// Verificación de API Key
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ERROR FATAL: No se encontró GEMINI_API_KEY en el archivo .env");
    process.exit(1);
}

// Configuración Modelo (Usamos flash-latest o 1.5-flash para evitar límite de cuota)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

const CARPETA_CONOCIMIENTO = './conocimiento';
let contextoPDF = ""; 

async function cargarContexto() {
    console.log("🔄 Iniciando lectura de PDFs...");
    contextoPDF = ""; 

    try {
        if (!fs.existsSync(CARPETA_CONOCIMIENTO)) {
            fs.mkdirSync(CARPETA_CONOCIMIENTO);
            console.log("📂 Carpeta 'conocimiento' creada.");
        }
        
        const archivos = fs.readdirSync(CARPETA_CONOCIMIENTO).filter(file => file.endsWith('.pdf'));

        if (archivos.length === 0) {
            console.log("⚠️ Alerta: No hay archivos PDF en la carpeta.");
            return false;
        }

        for (const archivo of archivos) {
            const ruta = path.join(CARPETA_CONOCIMIENTO, archivo);
            const dataBuffer = fs.readFileSync(ruta);
            
            try {
                const data = await pdf(dataBuffer);
                contextoPDF += `\n--- DOC: ${archivo} ---\n${data.text}\n`;
                console.log(`   ✅ Leído con éxito: ${archivo}`);
            } catch (err) {
                console.error(`   ❌ Error leyendo ${archivo}:`, err.message);
            }
        }
        
        console.log(`📚 Memoria lista. Total caracteres: ${contextoPDF.length}`);
        return true;

    } catch (error) {
        console.error("❌ Error general leyendo carpeta:", error);
        return false;
    }
}

cargarContexto();

app.post('/recargar', async (req, res) => {
    const exito = await cargarContexto();
    if (exito) res.json({ message: "Memoria actualizada." });
    else res.status(500).json({ message: "Error leyendo archivos." });
});

app.post('/chat', async (req, res) => {
    const { message } = req.body;
    
    if (!contextoPDF || contextoPDF.length < 50) {
        return res.json({ reply: "No he podido leer los documentos. Pulsa 'Actualizar' en el chat." });
    }

    try {
        const prompt = `
        Responde a la pregunta basándote ÚNICAMENTE en el siguiente contexto.
        Si no sabes la respuesta, di "No tengo esa información".

        --- CONTEXTO ---
        ${contextoPDF}
        ----------------
        
        PREGUNTA: "${message}"
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textoLimpio = response.text().replace(/\*/g, ''); 
        
        res.json({ reply: textoLimpio });

    } catch (error) {
        console.error("🔥 Error Gemini:", error);
        res.status(500).json({ reply: "Error procesando tu pregunta." });
    }
});

process.on('uncaughtException', (err) => { console.error('🔥 Error inesperado:', err); });
process.on('unhandledRejection', (reason, promise) => { console.error('🔥 Promesa rechazada:', reason); });

app.listen(3000, () => {
    console.log('---------------------------------------------------');
    console.log('🚀 SERVIDOR CORRIENDO');
    console.log('📡 Entra aquí para usar el micrófono: http://localhost:3000');
    console.log('---------------------------------------------------');
});