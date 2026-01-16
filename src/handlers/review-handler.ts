import { prisma } from "../prisma"
import { redis } from "../redis"

const handler: Record<string, (data: any) => Promise<void>> = {
    "REVIEW_UPDATED": updateProductReviewHandler,
}

export const ReviewEventHandlers = async <T>(data: {
    type: string,
    payload: T
}) => {
    const fn = handler[data.type]!
    await fn(data.payload)
}

async function updateProductReviewHandler(data: { reviewId: string }) {
    const review = await prisma.productReviews.findFirst({
        where: {
            id: data.reviewId,
        },
    })

    const reviews = await prisma.productReviews.findMany({
        where: {
            productId: review?.productId,
            isApproved: true
        }
    })
    const averageRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0

    await redis.set(
        `review:${review?.productId}`,
        JSON.stringify({
            rating: averageRating,
            count: reviews.length,
        }),
    )
    console.log(`redis review data update for product :${review?.productId}`)
}