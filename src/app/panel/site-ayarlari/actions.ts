"use server";

import { revalidatePath } from "next/cache";

import { UserRole } from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

export type SiteSettingsFormState = {
  error?: string;
  success?: string;
};

function normalizeWhatsappNumber(value: string): string {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (
    digits.length === 11 &&
    digits.startsWith("0")
  ) {
    digits = `90${digits.slice(1)}`;
  }

  if (
    digits.length === 10 &&
    digits.startsWith("5")
  ) {
    digits = `90${digits}`;
  }

  return digits;
}

function isValidWhatsappNumber(value: string): boolean {
  return (
    value.length >= 10 &&
    value.length <= 15 &&
    /^\d+$/.test(value) &&
    !/^0+$/.test(value)
  );
}

function readText(
  formData: FormData,
  name: string,
): string {
  return String(formData.get(name) ?? "").trim();
}

export async function updateSiteSettingsAction(
  _previousState: SiteSettingsFormState,
  formData: FormData,
): Promise<SiteSettingsFormState> {
  const user = await requireRole([
    UserRole.ADMIN,
  ]);

  const companyName = readText(
    formData,
    "companyName",
  );

  const headline = readText(
    formData,
    "headline",
  );

  const description = readText(
    formData,
    "description",
  );

  const rawWhatsappNumber = readText(
    formData,
    "whatsappNumber",
  );

  const whatsappMessage = readText(
    formData,
    "whatsappMessage",
  );

  const primaryColor =
    readText(formData, "primaryColor") ||
    "#171717";

  const whatsappNumber =
    normalizeWhatsappNumber(
      rawWhatsappNumber,
    );

  if (companyName.length < 2) {
    return {
      error:
        "Site adı en az 2 karakter olmalıdır.",
    };
  }

  if (headline.length < 2) {
    return {
      error:
        "Ana başlık en az 2 karakter olmalıdır.",
    };
  }

  if (description.length < 5) {
    return {
      error:
        "Site açıklaması en az 5 karakter olmalıdır.",
    };
  }

  if (
    !whatsappNumber ||
    !isValidWhatsappNumber(whatsappNumber)
  ) {
    return {
      error:
        "Geçerli bir ana WhatsApp numarası girin. Örnek: +90 555 555 55 55",
    };
  }

  if (whatsappMessage.length < 5) {
    return {
      error:
        "Varsayılan WhatsApp mesajı en az 5 karakter olmalıdır.",
    };
  }

  const previousSettings =
    await prisma.siteSettings.findUnique({
      where: {
        id: "default",
      },
    });

  try {
    const settings =
      await prisma.siteSettings.upsert({
        where: {
          id: "default",
        },
        update: {
          companyName,
          headline,
          description,
          whatsappNumber,
          whatsappMessage,
          primaryColor,
        },
        create: {
          id: "default",
          companyName,
          headline,
          description,
          whatsappNumber,
          whatsappMessage,
          primaryColor,
        },
      });

    await writeAuditLog({
      actor: user,
      action: "SETTINGS_UPDATE",
      entityType: "SiteSettings",
      entityId: settings.id,
      description: `${user.name}, site ayarlarını güncelledi.`,
      changes: {
        before: previousSettings
          ? {
              companyName:
                previousSettings.companyName,
              headline:
                previousSettings.headline,
              description:
                previousSettings.description,
              whatsappNumber:
                previousSettings.whatsappNumber,
              whatsappMessage:
                previousSettings.whatsappMessage,
              primaryColor:
                previousSettings.primaryColor,
            }
          : null,
        after: {
          companyName: settings.companyName,
          headline: settings.headline,
          description: settings.description,
          whatsappNumber:
            settings.whatsappNumber,
          whatsappMessage:
            settings.whatsappMessage,
          primaryColor: settings.primaryColor,
        },
      },
    });
  } catch (error) {
    console.error(
      "Site ayarları güncellenemedi:",
      error,
    );

    return {
      error:
        "Site ayarları güncellenirken bir hata oluştu. Lütfen tekrar deneyin.",
    };
  }

  revalidatePath("/");
  revalidatePath("/panel");
  revalidatePath("/panel/site-ayarlari");

  return {
    success:
      "Site ayarları güncellendi. Reklam butonları artık yeni ana WhatsApp numarasını kullanacak.",
  };
}
