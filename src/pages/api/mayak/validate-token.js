import { validateToken, useToken } from "@/utils/mayakTokens";

export default async function handler(req, res) {
    // GET - проверить токен без использования
    if (req.method === "GET") {
        try {
            const { token } = req.query;

            if (!token || typeof token !== "string") {
                return res.status(400).json({
                    success: false,
                    valid: false,
                    error: "Токен не указан"
                });
            }

            const result = validateToken(token);

            return res.status(200).json({
                success: true,
                valid: result.valid,
                error: result.error || null,
                remainingAttempts: result.remainingAttempts || 0,
            });
        } catch (error) {
            console.error("Error validating token:", error);
            return res.status(500).json({
                success: false,
                valid: false,
                error: "Ошибка сервера"
            });
        }
    }

    // POST - использовать токен (увеличить счетчик)
    if (req.method === "POST") {
        try {
            const { token } = req.body;

            if (!token || typeof token !== "string") {
                return res.status(400).json({
                    success: false,
                    error: "Токен не указан"
                });
            }

            const result = useToken(token);

            if (!result.success) {
                return res.status(403).json({
                    success: false,
                    error: result.error,
                    remainingAttempts: 0,
                });
            }

            return res.status(200).json({
                success: true,
                message: "Токен использован",
                remainingAttempts: result.remainingAttempts,
            });
        } catch (error) {
            console.error("Error using token:", error);
            return res.status(500).json({
                success: false,
                error: "Ошибка сервера"
            });
        }
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
}
