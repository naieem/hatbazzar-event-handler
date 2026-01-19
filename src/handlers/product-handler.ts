import type { Product } from "../../generated-client/client"
import type { ProductVariantCreateManyInput } from "../../generated-client/models"
import { prisma } from "../prisma"

type ProductVariant = {
    id: string
    sku: string
    name: string
    price: number
    stock: number
    attributes: Record<"size" | "color", string>
}

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
async function createProductHandler(data: Product & { variants: ProductVariant[] }) {
    const { variants, ...obj } = data
    const product = await prisma.product.create({
        data: {
            ...obj,
        }
    })

    await prisma.productVariant.createMany({
        data: variants.map((variant): ProductVariantCreateManyInput => ({
            name: variant.name,
            id: variant.id,
            sku: variant.sku,
            stock: variant.stock,
            productId: product.id,
            price: variant.price,
            attributes: variant.attributes
        }))
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
    console.log("product updated with id " + data.id)
}