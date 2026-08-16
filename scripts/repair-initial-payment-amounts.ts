import {
  SubscriptionPaymentType,
} from "../src/generated/prisma/client";
import prisma from "../src/lib/prisma";

const APPLY = process.argv.includes("--apply");

/*
 * Eski sistemde ilk ödeme tutarı ayrı bir alandan
 * kaydedildiği için 0,50 / 1 TL gibi hatalı test
 * değerleri oluşmuş olabilir.
 *
 * Bu script SADECE:
 * - INITIAL ödeme olan,
 * - tutarı 10 TL veya altında olan,
 * - halen bir Product kaydına bağlı olan
 * kayıtları aday kabul eder.
 *
 * Varsayılan çalışma DRY RUN'dır.
 * Gerçek güncelleme için:
 *   npx tsx scripts/repair-initial-payment-amounts.ts --apply
 */
async function main() {
  const candidates =
    await prisma.productPayment.findMany({
      where: {
        type: SubscriptionPaymentType.INITIAL,
        amount: {
          lte: 10,
        },
        productId: {
          not: null,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            subscriptionFee: true,
          },
        },
      },
      orderBy: {
        paidAt: "asc",
      },
    });

  const repairable = candidates.filter(
    (
      payment,
    ): payment is typeof payment & {
      product: NonNullable<typeof payment.product>;
    } =>
      Boolean(payment.product) &&
      Number(payment.product?.subscriptionFee ?? 0) > 10,
  );

  console.log("");
  console.log(
    APPLY
      ? "APPLY MODE — kayıtlar güncellenecek"
      : "DRY RUN — veritabanına yazılmayacak",
  );
  console.log(
    `Aday kayıt: ${repairable.length}`,
  );
  console.log("");

  let oldTotal = 0;
  let newTotal = 0;

  for (const payment of repairable) {
    const oldAmount = Number(payment.amount);
    const newAmount = Number(
      payment.product.subscriptionFee,
    );

    oldTotal += oldAmount;
    newTotal += newAmount;

    console.log(
      `${payment.productName.padEnd(24)} ${String(
        oldAmount,
      ).padStart(8)} TL -> ${String(
        newAmount,
      ).padStart(8)} TL`,
    );
  }

  console.log("");
  console.log(
    `Eski toplam: ${oldTotal.toFixed(2)} TL`,
  );
  console.log(
    `Yeni toplam: ${newTotal.toFixed(2)} TL`,
  );
  console.log(
    `Tahsilata eklenecek fark: ${(
      newTotal - oldTotal
    ).toFixed(2)} TL`,
  );

  if (!APPLY) {
    console.log("");
    console.log(
      "Sonucu kontrol ettikten sonra uygulamak için:",
    );
    console.log(
      "npx tsx scripts/repair-initial-payment-amounts.ts --apply",
    );
    return;
  }

  await prisma.$transaction(
    repairable.map((payment) =>
      prisma.productPayment.update({
        where: {
          id: payment.id,
        },
        data: {
          amount:
            payment.product.subscriptionFee,
          note: payment.note
            ? `${payment.note} | Eski hatalı ilk ödeme tutarı ${payment.amount.toString()} TL'den ürün abonelik ücretine eşitlendi.`
            : `Eski hatalı ilk ödeme tutarı ${payment.amount.toString()} TL'den ürün abonelik ücretine eşitlendi.`,
        },
      }),
    ),
  );

  console.log("");
  console.log(
    `${repairable.length} ödeme kaydı güncellendi.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
