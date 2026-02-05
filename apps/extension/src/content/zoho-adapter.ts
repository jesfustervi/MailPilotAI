/**
 * ZOHO ADAPTER
 * Este script se ejecuta en el contexto de mail.zoho.com
 */

// Type definitions for email data structure
interface EmailMessage {
    sender: string;
    senderEmail?: string;
    body: string;
    date?: string;
    timestamp?: number;
    messageId?: string;
}

interface EmailData {
    subject: string;
    thread: EmailMessage[];
    url: string;
    timestamp: number;
    to?: string;
    cc?: string;
}

console.log("🚀 MailMind: Zoho Adapter cargado y listo.");

/**
 * Extrae los datos del correo abierto en Zoho Mail
 * 
 * @returns {EmailData} Datos extraídos del email incluyendo asunto, thread de mensajes, destinatarios y metadatos
 * @throws {Error} Puede lanzar errores si las operaciones DOM fallan
 */
const extractEmailData = (): EmailData => {
    // Specific selectors for Zoho Mail (may vary depending on the version)
    const subject = document.querySelector('.zmLSub')?.textContent?.trim() || "Sin asunto";

    // Extraer destinatarios (To y CC) si están disponibles
    const toElement = document.querySelector('.zm_msg_to, .zmTo');
    const to = toElement?.textContent?.trim();
    
    const ccElement = document.querySelector('.zm_msg_cc, .zmCC');
    const cc = ccElement?.textContent?.trim();

    // Zoho carga los mensajes en hilos. Buscamos todos los bloques de mensaje.
    const messageBlocks = document.querySelectorAll('.zm_msg_item');
    
    console.log(`📩 Encontrados ${messageBlocks.length} bloques de mensaje en el hilo`);
    
    const thread: EmailMessage[] = Array.from(messageBlocks).map((msg, index) => {
        // Extraer información del remitente
        const senderElement = msg.querySelector('.zm_msg_from');
        const sender = senderElement?.textContent?.trim() || "Desconocido";
        
        // Intentar extraer email del remitente
        let senderEmail: string | undefined;
        const titleAttr = senderElement?.getAttribute('title');
        if (titleAttr) {
            senderEmail = titleAttr;
        } else {
            const emailMatch = senderElement?.textContent?.match(/<([^>]+)>/);
            if (emailMatch) {
                senderEmail = emailMatch[1];
            }
        }
        
        // Extraer el cuerpo del mensaje
        const bodyElement = msg.querySelector('.zm_msg_txt');
        const body = bodyElement?.textContent?.trim() || "";
        
        // Extraer la fecha/hora del mensaje
        const dateElement = msg.querySelector('.zm_msg_date, .zmMsgDate, time');
        const date = dateElement?.textContent?.trim();
        
        // Intentar extraer timestamp numérico o convertir desde datetime
        let timestamp: number | undefined;
        const timestampAttr = dateElement?.getAttribute('data-timestamp');
        const datetimeAttr = dateElement?.getAttribute('datetime');
        
        if (timestampAttr) {
            const parsed = parseInt(timestampAttr, 10);
            if (!isNaN(parsed)) {
                timestamp = parsed;
            }
        } else if (datetimeAttr) {
            const dateObj = new Date(datetimeAttr);
            if (!isNaN(dateObj.getTime())) {
                timestamp = dateObj.getTime();
            }
        }
        
        // Extraer ID del mensaje si está disponible
        const messageId = msg.getAttribute('data-msgid') || 
                         msg.getAttribute('id') || 
                         `msg_${index}`;
        
        console.log(`  Mensaje ${index + 1}: ${sender} - ${body.substring(0, 50)}...`);
        
        return { 
            sender, 
            senderEmail,
            body,
            date,
            timestamp,
            messageId
        };
    }).filter(m => m.body.length > 0); // Filtrar mensajes vacíos

    console.log(`✅ Extraídos ${thread.length} mensajes válidos del hilo`);

    return {
        subject,
        thread,
        to,
        cc,
        url: window.location.href,
        timestamp: Date.now()
    };
};

// Escuchar mensajes desde la Extensión (SidePanel o Popup)
chrome.runtime.onMessage.addListener((request, __, sendResponse) => {
    if (request.action === "READ_ZOHO_EMAIL") {
        try {
            const emailData = extractEmailData();
            console.log("📧 Datos extraídos de Zoho:", emailData);
            
            // Validar que tenemos al menos un asunto o contenido
            if (!emailData.subject && emailData.thread.length === 0) {
                console.warn("⚠️ No se encontró contenido de email en la página");
                sendResponse({ 
                    error: "No se encontró contenido de email en la página actual",
                    data: null 
                });
            } else {
                sendResponse({ 
                    error: null,
                    data: emailData 
                });
            }
        } catch (error) {
            console.error("❌ Error al extraer datos del email:", error);
            sendResponse({ 
                error: error instanceof Error ? error.message : "Error desconocido",
                data: null 
            });
        }
    }
    return true; // Mantener el canal de respuesta abierto para respuestas asíncronas
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