import { prisma } from "../prisma"
import { redis } from "../redis"

const handler: Record<string, (data: any) => Promise<void>> = {
    "CREATE_SUBSCRIPTION": createSubscriptionHandler,
}

export const NewsletterEventHandlers = async <T>(data: {
    type: string,
    payload: T
}) => {
    const fn = handler[data.type]!
    await fn(data.payload)
}

async function createSubscriptionHandler(data: { email: string }) {
    const email = data.email
    console.log('-------------------------------')
    console.log(`newsletter subscription -> ${email}`)

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        console.log("invalid email")
        return
    }

    const existing = await prisma.newsletterSubscriber.findUnique({
        where: { email: email.toLowerCase() }
    });

    let token;
    if (existing) {
        if (existing.isSubscribed) {
            console.log("already subscribed")
            return
        }

        // Resubscribe
        await prisma.newsletterSubscriber.update({
            where: { email: email.toLowerCase() },
            data: {
                isSubscribed: true,
                subscribedAt: new Date(),
                unsubscribedAt: null
            }
        });

        token = existing.unsubscribeToken

        console.log("Successfully resubscribed to newsletter")
        return
    } else {
        const newsLetter = await prisma.newsletterSubscriber.create({
            data: { email: email.toLowerCase() }
        });
        token = newsLetter.unsubscribeToken
    }

    await redis.publish("send-email", JSON.stringify({
        "to": email,
        "subject": "LubeBazzar subscription",
        "template": "newsletter-new-subscription.html",
        "data": { "Url": `${process.env.PUBLIC_APP_URL}`, "UnsubscribeUrl": `${process.env.PUBLIC_APP_URL}/unsubscribe?token=${token}` },
    }))

    console.log('-------------------------------')

}