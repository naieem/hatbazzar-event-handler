import { ForgotPasswordEventHandler, NewsletterEventHandlers, OrderEventHandlers, ProductEventHandlers, ReviewEventHandlers } from "./handlers";
import { subscriber } from "./redis"

console.log("📨 Event handler started");


/**
 * redis 
 */

const redisHandlers: Record<string, (event: any) => Promise<void>> = {
    "review.events": ReviewEventHandlers,
    "product.events": ProductEventHandlers,
    "order.events":OrderEventHandlers,
    "forgotPassword.events":ForgotPasswordEventHandler,
    "newsletter.events":NewsletterEventHandlers
}

subscriber.psubscribe("*.events", (err) => {
    if (err) {
        console.error("❌ Failed to subscribe:", err)
    } else {
        console.log("✅ Listening on redis events")
    }
})

subscriber.on("pmessage", async (pattern, channel, message) => {
    try {
        const event = JSON.parse(message)
        await redisHandlers[channel]!(event)

    } catch (err) {
        console.error("❌ Error processing event:", err)
    }
})
