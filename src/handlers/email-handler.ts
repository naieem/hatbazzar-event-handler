// import { consumer } from "../kafka";

// await consumer.connect();
// await consumer.subscribe({ topic: "event-emails" });
// await consumer.subscribe({ topic: "event-orders" });

// console.log("📨 Kafka consumer started");

// await consumer.run({
//     eachMessage: async ({ topic,message }) => {
//         if (!message.value) return;

//         const raw = message.value.toString()
//         const event = JSON.parse(JSON.parse(raw));

//         switch (topic) {
//             case "event-emails":
//                 // handle email
//                 break;

//             case "event-orders":
//                 // handle user-related events
//                 break;
//         }

//         switch (event.type) {
//             case "USER_WELCOME":
//                 console.log("ye found user email event")
//                 console.log(event.payload)
//                 break;
//             default:
//                 console.warn("Unknown event type:", event.type);
//         }
//     },
// });
