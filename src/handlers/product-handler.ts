import type { Product } from "../../generated-client/client"
import { prisma } from "../prisma"

const handler: Record<string, (data: any) => Promise<void>> = {
    "CREATE_PRODUCT": createProductHandler,
    "UPDATE_PRODUCT": updateProductHandler
}

export const ProductEventHandlers = async <T>(data: {
    type: string,
    payload: T
}) => {
    const fn = handler[data.type]!
    await fn(data.payload)
}

/**
 * create product
 * 
 * @param {Product} data 
 */
async function createProductHandler(data: Product) {
    const product = await prisma.product.create({
        data: {
            ...data,
        }
    })
    console.log(`new product created :${product.id}`)
}

/**
 * update product
 * 
 * @param {Partial<Product>} data 
 */
async function updateProductHandler(data: Partial<Product>) {
    await prisma.product.update({
        where: {
            id: data.id,
        },
        data: {
            ...data,
        },
    })
    console.log("product updated with id "+ data.id)
}