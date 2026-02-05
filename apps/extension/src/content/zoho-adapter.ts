/**
 * ZOHO ADAPTER
 * Este script se ejecuta en el contexto de mail.zoho.com
 */


console.log("🚀 MailMind: Zoho Adapter cargado y listo.");

// Función para extraer los datos del correo abierto
const extractEmailData = () => {
    // Specific selectors for Zoho Mail  (may vary depending on the version)
    const subject = document.querySelector('.zmLSub')?.textContent || "Sin asunto";

    // Zoho carga los mensajes en hilos. Buscamos todos los bloques de mensaje.
    const messageBlocks = document.querySelectorAll('.zm_msg_item');
    const thread = Array.from(messageBlocks).map((msg) => {
        const sender = msg.querySelector('.zm_msg_from')?.textContent || "Desconocido";
        const body = msg.querySelector('.zm_msg_txt')?.textContent || "";
        return { sender, body: body.trim() };
    }).filter(m => m.body.length > 0);

    return {
        subject,
        thread,
        url: window.location.href,
        timestamp: Date.now()
    };
};

// Escuchar mensajes desde la Extensión (SidePanel o Popup)
chrome.runtime.onMessage.addListener((request, __, sendResponse) => {
    if (request.action === "READ_ZOHO_EMAIL") {
        const emailData = extractEmailData();
        console.log("📧 Datos extraídos de Zoho:", emailData);
        sendResponse(emailData);
    }
    return true;
});

/**
 * OPCIONAL: Inyectar un botón en la interfaz de Zoho
 * Esto observa si aparece la barra de herramientas de Zoho para meter nuestro botón
 */
const observer = new MutationObserver(() => {
    const toolbar = document.querySelector('.zm_toolbar');
    if (toolbar && !document.getElementById('mailmind-btn')) {
        const btn = document.createElement('button');
        btn.id = 'mailmind-btn';
        btn.innerText = '🧠 Analizar con IA';
        btn.style.cssText = "background: #5b21b6; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 10px; font-weight: bold;";

        btn.onclick = () => {
            // Abrir el SidePanel (requiere permiso sidePanel en manifest)
            chrome.runtime.sendMessage({ action: "OPEN_PANEL" });
        };

        toolbar.appendChild(btn);
    }
});

observer.observe(document.body, { childList: true, subtree: true });