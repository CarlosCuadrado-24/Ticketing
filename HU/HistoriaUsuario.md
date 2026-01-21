### **Historia de Usuario**

**Título Sugerido:** `Sugerencia inteligente de tickets alternativos y personalización de mensajes`

**Historia de Usuario:**
> **Como** `comprador de entradas para eventos`,
> **Quiero** `recibir sugerencias de tickets alternativos relevantes si el seleccionado ya no está disponible, con mensajes adaptados al tipo de evento y mis preferencias`,
> **Para** `no perder tiempo buscando de nuevo, reducir la frustración y aumentar la probabilidad de completar la compra`.

**Descripción y Contexto:**
Cuando un ticket seleccionado deja de estar disponible por concurrencia, el sistema debe sugerir alternativas usando una suma ponderada de criterios para determinar el "mejor sustituto". Los criterios principales son: contigüidad (distancia física entre asientos), similitud de precio (dentro de un rango de ±10%), pertenencia a la misma categoría o zona, y calidad de visión (cuando aplique, usando metadatos). El sistema utilizará una fórmula de puntuación para clasificar y presentar las mejores opciones disponibles.

Además, los mensajes que acompañan estas sugerencias deben personalizarse según el tipo de evento (deporte, teatro, conciertos, etc.) y la zona, usando un sistema de plantillas dinámicas. La decisión de guardar preferencias del usuario dependerá del modelo de negocio: para compras ocasionales se puede operar de manera transaccional, y para plataformas con compras recurrentes, guardar datos permite ofrecer una experiencia más personalizada y segmentada.

**Criterios de Aceptación (AC):**

*   **AC 1: Cálculo de sustituto óptimo**
    > **Dado que** un ticket ya no está disponible por concurrencia,
    > **Cuando** el sistema busca alternativas,
    > **Entonces** utiliza una fórmula ponderada:
    > `Score = (w1 * Distancia) + (w2 * Delta_Precio) + (w3 * Zona) + (w4 * Calidad_Vision)`
    > Y sugiere al usuario los tickets con mejor puntuación.

*   **AC 2: Rango de precio restringido**
    > **Dado que** el sistema sugiere alternativas,
    > **Cuando** evalúa el precio,
    > **Entonces** prioriza tickets en un rango de ±10% del precio original, solo mostrando opciones más costosas si no hay alternativas en ese rango.

*   **AC 3: Mensajes personalizados por evento y zona**
    > **Dado que** el usuario recibe una sugerencia de ticket alternativo,
    > **Cuando** el evento es, por ejemplo, un partido de fútbol o una ópera,
    > **Entonces** el mensaje es adaptado al contexto usando plantillas específicas por evento y zona.

*   **AC 4: Configuración dinámica de plantillas**
    > **Dado que** existe diversidad de eventos y zonas,
    > **Cuando** se genera una sugerencia,
    > **Entonces** el sistema usa un template adecuado a partir del `evento_id` o `categoria_id` para el texto del mensaje.

*   **AC 5: Gestión de preferencias del usuario (opcional)**
    > **Dado que** la plataforma decide guardar el historial de preferencias,
    > **Cuando** el usuario inicia sesión,
    > **Entonces** el sistema prioriza sugerencias basadas en compras previas y preferencias habituales; si no se guardan datos, usa solo los criterios de la sesión actual.

*   **Performance:** El cálculo de sustitutos y la generación de mensajes debe ejecutarse en menos de 500 ms.
*   **Seguridad/Privacidad:** Para el enfoque relacional, cumplir con normativas como GDPR y permitir al usuario gestionar sus preferencias.
*   **Implementación Técnica:** Sistema de plantillas en base de datos, lógica de negocio para cálculo de score y sugerencias, y opción de persistencia de preferencias según configuración.
*   **Experiencia de Usuario:** Los mensajes deben ser empáticos, claros y proactivos, ayudando al usuario a tomar una decisión rápidamente.

---
