import { addAttemptsToToken, getTokenById } from "@/utils/mayakTokens";

const ADMIN_PASSWORD = "a12345";

// Проверка пароля администратора
function checkAdminPassword(req) {
    const password = req.body?.password;

    if (password === ADMIN_PASSWORD) {
        return { authorized: true };
    }

    return { authorized: false, error: "Неверный пароль" };
}

export default async function handler(req, res) {
    if (req.method !== "PATCH") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    // Проверка пароля администратора
    const authCheck = checkAdminPassword(req);
    if (!authCheck.authorized) {
        return res.status(403).json({ success: false, error: authCheck.error });
    }

    try {
        const { id } = req.query;
        const { attempts } = req.body;

        // Проверяем существование токена
        const existingToken = getTokenById(id);
        if (!existingToken) {
            return res.status(404).json({ success: false, error: "Токен не найден" });
        }

        // Валидация количества попыток
        if (!attempts || isNaN(parseInt(attempts, 10)) || parseInt(attempts, 10) <= 0) {
            return res.status(400).json({ success: false, error: "Количество попыток должно быть положительным числом" });
        }

        const updatedToken = addAttemptsToToken(id, attempts);

        if (!updatedToken) {
            return res.status(500).json({ success: false, error: "Ошибка обновления токена" });
        }

        return res.status(200).json({
            success: true,
            data: {
                ...updatedToken,
                remainingAttempts: updatedToken.usageLimit - updatedToken.usedCount,
            },
        });
    } catch (error) {
        console.error("Error adding attempts:", error);
        return res.status(500).json({ success: false, error: "Ошибка сервера" });
    }
}
