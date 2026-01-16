import crypto from 'crypto'

import { prisma } from "../prisma"
import { redis } from "../redis"

export async function ForgotPasswordEventHandler(data: {
    email: string,
}) {
    console.log('------------------------------------')
    console.log(`forgot password event -> ${data.email}`)
    const user = await prisma.user.findUnique({ where: { email: data.email } })
    // Prevent email enumeration
    if (!user) {
        console.log('user not found')
        return
    }

    let diffInMinutes: number = 9999

    let redisData = await redis.get(`forgotPassword#${user.id}`)
    if (!redisData) {
        await redis.set(`forgotPassword#${user.id}`, JSON.stringify({
            lastSentAt: new Date().toISOString()
        }))
    } else {
        const parsedData: { lastSentAt: Date } = JSON.parse(redisData)
        const lasttime = new Date(parsedData.lastSentAt).getTime();
        const present = new Date().getTime();
        diffInMinutes = Math.floor((present - lasttime) / (1000 * 60));
    }

    if (diffInMinutes && diffInMinutes < 10) {
        return
    }

    const unusedToken = await prisma.passwordResetToken.findMany({
        where: {
            userId: user.id,
            expiresAt: {
                lt: new Date()
            }
        }, select: {
            token: true
        }
    })
    let token;
    if (!unusedToken.length) {
        token = crypto.randomBytes(32).toString("hex")
        await prisma.passwordResetToken.create({
            data: {
                token,
                userId: user.id,
                expiresAt: new Date(Date.now() + 1000 * 60 * 10), // 10 min
            },
        })
    } else
        token = unusedToken[0]!.token

    const resetUrl = `${process.env.PUBLIC_APP_URL}/reset-password?token=${token}`

    await redis.publish("send-email", JSON.stringify({
        "to": user.email,
        "subject": "Reset password",
        "template": "reset-password.html",
        "data": { "Name": user.name, "Url": resetUrl },
    }))

    await redis.set(`forgotPassword#${user.id}`, JSON.stringify({
        lastSentAt: new Date()
    }))
    console.log(`forgot password event ends -> ${data.email}`)
    console.log('------------------------------------')

}