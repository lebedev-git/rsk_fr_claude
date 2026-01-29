import { addAttemptsToToken, getTokenById } from "@/utils/mayakTokens";

// Проверка роли администратора
async function checkAdminRole(req) {
    const token = req.cookies.users_access_token;
    if (!token) {
        return { authorized: false, error: "Не авторизован" };
    }

    try {
        const response = await fetch("https://api.rosdk.ru/users/me/", {
            headers: {
                "Content-Type": "application/json",
                Cookie: req.headers.cookie || "",
            },
        });

        if (!response.ok) {
            return { authorized: false, error: "Ошибка авторизации" };
        }

        const userData = await response.json();

        const isAdmin = userData.role === "admin" ||
                        userData.is_admin === true ||
                        userData.is_superuser === true ||
                        userData.is_staff === true;

        if (!isAdmin) {
            return { authorized: false, error: "Доступ запрещен. Требуются права администратора" };
        }

        return { authorized: true, user: userData };
    } catch (error) {
        console.error("Admin check error:", error);
        return { authorized: false, error: "Ошибка проверки прав" };
    }
}

export default async function handler(req, res) {
    if (req.method !== "PATCH") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    // Проверка прав администратора
    const authCheck = await checkAdminRole(req);
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
