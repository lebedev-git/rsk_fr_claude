import { deactivateToken, getTokenById } from "@/utils/mayakTokens";

const ADMIN_PASSWORD = "a12345";

// Проверка пароля администратора
function checkAdminPassword(req) {
    const password = req.query.password || req.body?.password;

    if (password === ADMIN_PASSWORD) {
        return { authorized: true };
    }

    return { authorized: false, error: "Неверный пароль" };
}

export default async function handler(req, res) {
    // Проверка пароля администратора
    const authCheck = checkAdminPassword(req);
    if (!authCheck.authorized) {
        return res.status(403).json({ success: false, error: authCheck.error });
    }

    const { id } = req.query;

    // GET - получить конкретный токен
    if (req.method === "GET") {
        try {
            const token = getTokenById(id);

            if (!token) {
                return res.status(404).json({ success: false, error: "Токен не найден" });
            }

            return res.status(200).json({
                success: true,
                data: {
                    ...token,
                    remainingAttempts: token.usageLimit - token.usedCount,
                },
            });
        } catch (error) {
            console.error("Error fetching token:", error);
            return res.status(500).json({ success: false, error: "Ошибка сервера" });
        }
    }

    // DELETE - деактивировать токен
    if (req.method === "DELETE") {
        try {
            const existingToken = getTokenById(id);
            if (!existingToken) {
                return res.status(404).json({ success: false, error: "Токен не найден" });
            }

            const deactivatedToken = deactivateToken(id);

            if (!deactivatedToken) {
                return res.status(500).json({ success: false, error: "Ошибка деактивации токена" });
            }

            return res.status(200).json({
                success: true,
                message: "Токен деактивирован",
                data: deactivatedToken,
            });
        } catch (error) {
            console.error("Error deactivating token:", error);
            return res.status(500).json({ success: false, error: "Ошибка сервера" });
        }
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
}
