import { prisma } from "../prisma"
import { redis } from "../redis"

const handler: Record<string, (data: any) => Promise<void>> = {
    "CREATE_ORDER": createOrderHandler,
}

export const OrderEventHandlers = async <T>(data: {
    type: string,
    payload: T
}) => {
    const fn = handler[data.type]!
    await fn(data.payload)
}

type CheckoutEventValues = {
    name: string
    email: string
    phone?: string

    address: string
    city: string
    postalCode: string
    country: string

    createAccount: boolean
    userId: string;
    password?: string
    confirmPassword?: string

    paymentMethod: "cod" | "stripe"
    orderId: string

    cardNumber?: string
    cardExpiry?: string
    cardCvc?: string
}

export interface CartItem {
    productId: string
    quantity: number
}
async function createOrderHandler(data: CheckoutEventValues) {
    let user = await prisma.user.findFirst({
        where: {
            id: data.userId,
        },
        include: {
            address: true
        }
    })

    const cartData = await redis.get(`cart#${data.userId}`)

    const items: CartItem[] = Object.values(JSON.parse(cartData!))
    const itemsMap: Record<string, number> = {}
    items.forEach((item) => {
        itemsMap[item.productId] = item.quantity
    })

    await prisma.$transaction(async (tx) => {
        const products = await tx.product.findMany({
            where: {
                id: {
                    in: Object.keys(itemsMap)
                },
            }
        })
        // adjust product stock
        await Promise.all(products.map((product) => tx.product.update(
            {
                where: {
                    id: product.id,
                    stockQuantity: {
                        gte: itemsMap[product.id]
                    }
                },
                data: {
                    stockQuantity: {
                        decrement: itemsMap[product.id]
                    }
                }
            }
        )))

        if (!user?.address) {
            await tx.address.create({
                data: {
                    userId: data.userId,
                    city: data.city,
                    postalCode: data.postalCode,
                    country: data.country,
                    line1: data.address,
                    phone: data.phone
                }
            })
        }

        const totalAmount = products.reduce((acc, val) => {
            return acc + (val.sellingPrice * itemsMap[val.id]!)
        }, 0)

        await tx.orderItem.createMany({
            data: products.map((product) => ({
                orderId: data.orderId,
                productId: product.id,
                quantity: itemsMap[product.id]!,
                unitPrice: product.sellingPrice,
                totalPrice: itemsMap[product.id]! * product.sellingPrice
            }))
        })

        await tx.payment.create({
            data: {
                orderId: data.orderId,
                status: "PENDING",
                amount: totalAmount,
                provider: data.paymentMethod
            }
        })

        console.log(`new order created with id ${data.orderId}`)
    })
    // delete redis cart data
    await redis.del(`cart#${data.userId}`)
}