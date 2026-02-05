/**
 * ZOHO ADAPTER
 * this script is running in the mail.zoho.com context
 * it extracts email data from the opened email and sends it to the extension
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

console.log("🚀 MailMind: Zoho Adapter loaded and ready.");

/**
 * Extracts data from the opened email in Zoho Mail
 * 
 * @returns {EmailData} Extracted email data including subject, message thread, recipients, and metadata    
 * @throws {Error} May throw errors if DOM operations fail
 */
const extractEmailData = (): EmailData => {
    // Specific selectors for Zoho Mail (may vary depending on the version)
    const subject = document.querySelector('.zmLSub')?.textContent?.trim() || "No Subject";

    // Extract recipients (To and CC) if available
    const toElement = document.querySelector('.zm_msg_to, .zmTo');
    const to = toElement?.textContent?.trim();
    const ccElement = document.querySelector('.zm_msg_cc, .zmCC');
    const cc = ccElement?.textContent?.trim();

    // Zoho loads messages in threads. We look for all message blocks.
    const messageBlocks = document.querySelectorAll('.zm_msg_item');
    console.log(`📩 Found ${messageBlocks.length} message blocks in the thread`);
    const thread: EmailMessage[] = Array.from(messageBlocks).map((msg, index) => {
        // Extract sender information
        const senderElement = msg.querySelector('.zm_msg_from');
        const sender = senderElement?.textContent?.trim() || "Unknown";
        // Attempt to extract sender email
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

        // Extract the body of the message
        const bodyElement = msg.querySelector('.zm_msg_txt');
        const body = bodyElement?.textContent?.trim() || "";

        // Extract the date/time of the message
        const dateElement = msg.querySelector('.zm_msg_date, .zmMsgDate, time');
        const date = dateElement?.textContent?.trim();

        // Attempt to extract numeric timestamp or convert from datetime
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

        // Extract message ID if available
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
    }).filter(m => m.body.length > 0); // Filter out empty messages

    console.log(`✅ Extracted ${thread.length} valid messages from the thread`);

    return {
        subject,
        thread,
        to,
        cc,
        url: window.location.href,
        timestamp: Date.now()
    };
};

// Listen for messages from the Extension (SidePanel or Popup)
chrome.runtime.onMessage.addListener((request, __, sendResponse) => {
    if (request.action === "READ_ZOHO_EMAIL") {
        try {
            const emailData = extractEmailData();
            console.log("📧 Extracted data from Zoho:", emailData);

            // Validate that we have at least a subject or content
            if (!emailData.subject && emailData.thread.length === 0) {
                console.warn("⚠️ No email content found on the page");
                sendResponse({
                    error: "No email content found on the current page",
                    data: null
                });
            } else {
                sendResponse({
                    error: null,
                    data: emailData
                });
            }
        } catch (error) {
            console.error("❌ Error extracting email data:", error);
            sendResponse({
                error: error instanceof Error ? error.message : "Unknown error",
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