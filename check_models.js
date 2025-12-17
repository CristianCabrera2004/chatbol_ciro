require('dotenv').config();

async function listarModelos() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("❌ Error: No se encontró la GEMINI_API_KEY en el archivo .env");
    return;
  }

  console.log("🔍 Preguntando a Google qué modelos tienes disponibles...");
  
  // URL oficial para listar modelos
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await fetch(url); // Usamos fetch nativo de Node.js
    const data = await response.json();

    if (data.error) {
      console.error("❌ Error de Google:", data.error.message);
      return;
    }

    if (!data.models) {
      console.log("⚠️ Tu cuenta no tiene modelos asignados. (Raro)");
      return;
    }

    console.log("\n✅ ¡ÉXITO! Estos son los nombres EXACTOS que debes usar:");
    console.log("======================================================");
    
    // Filtramos solo los que sirven para chatear (generateContent)
    const modelosChat = data.models.filter(m => 
      m.supportedGenerationMethods.includes("generateContent")
    );

    modelosChat.forEach(modelo => {
      // El nombre viene como "models/gemini-pro", quitamos el prefijo para verlo claro
      const nombreCorto = modelo.name.replace("models/", "");
      console.log(`👉 ${nombreCorto}`);
    });
    
    console.log("======================================================\n");
    console.log("💡 Elige uno de la lista de arriba y ponlo en tu server.js");

  } catch (error) {
    console.error("🔥 Error de conexión:", error.message);
  }
}

listarModelos();