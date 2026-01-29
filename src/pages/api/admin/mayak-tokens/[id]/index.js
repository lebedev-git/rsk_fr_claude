import { deactivateToken, getTokenById } from "@/utils/mayakTokens";

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
    // Проверка прав администратора
    const authCheck = await checkAdminRole(req);
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
