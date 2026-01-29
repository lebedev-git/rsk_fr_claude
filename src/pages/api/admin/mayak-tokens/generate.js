import { createToken } from "@/utils/mayakTokens";

// Проверка роли администратора
async function checkAdminRole(req) {
    const token = req.cookies.users_access_token;
    if (!token) {
        return { authorized: false, error: "Не авторизован" };
    }

    try {
        // Проверяем роль через внешний API
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

        // Проверяем, является ли пользователь администратором
        // Предполагаем, что роль хранится в userData.role или userData.is_admin
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
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    // Проверка прав администратора
    const authCheck = await checkAdminRole(req);
    if (!authCheck.authorized) {
        return res.status(403).json({ success: false, error: authCheck.error });
    }

    try {
        const { name, usageLimit } = req.body;

        // Валидация входных данных
        if (!name || typeof name !== "string" || name.trim() === "") {
            return res.status(400).json({ success: false, error: "Название токена обязательно" });
        }

        if (!usageLimit || isNaN(parseInt(usageLimit, 10)) || parseInt(usageLimit, 10) <= 0) {
            return res.status(400).json({ success: false, error: "Лимит использований должен быть положительным числом" });
        }

        const newToken = createToken(name.trim(), usageLimit);

        return res.status(201).json({
            success: true,
            data: newToken,
        });
    } catch (error) {
        console.error("Error generating token:", error);
        return res.status(500).json({ success: false, error: "Ошибка сервера" });
    }
}
