import Button from "@/components/ui/Button";

export default function Buffer({ onClose, onInsert, onUpdate, buffer, currentField }) {
    const bufferItems = buffer[currentField] || [];

    // Функция для удаления элемента из буфера
    const handleDelete = (index) => {
        // Создаем новый массив без удаляемого элемента
        const newBufferItems = [...bufferItems.slice(0, index), ...bufferItems.slice(index + 1)];

        // Обновляем буфер через callback
        const newBuffer = { ...buffer, [currentField]: newBufferItems };
        if (onUpdate) {
            onUpdate(newBuffer);
        }
    };

    // Если буфер пустой, показываем сообщение
    if (bufferItems.length === 0) {
        return (
            <div className="w-full h-full bg-white absolute top-0 left-0 p-[2rem]">
                <div className="flex relative h-full w-full border-dashed border-(--color-gray-plus) rounded-[0.75rem] items-center justify-center border-[3px]">
                    <button
                        className="absolute top-[1rem] right-[1rem] flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 text-2xl font-light"
                        onClick={onClose}
                        title="Закрыть">
                        ×
                    </button>
                    <div className="flex flex-col gap-[1.5rem] items-center w-[80%]">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold mb-2">Буфер пуст</h3>
                            <p className="text-gray-500 text-sm">
                                Добавьте значения в буфер с помощью кнопки &quot;+&quot; рядом с полем ввода
                            </p>
                        </div>
                        <Button inverted className="!w-[60%]" onClick={onClose}>
                            Вернуться назад
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-white absolute top-0 left-0 p-[2rem]">
            <div className="flex relative h-full w-full border-dashed border-(--color-gray-plus) rounded-[0.75rem] items-center justify-center border-[3px]">
                <button
                    className="absolute top-[1rem] right-[1rem] flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 text-2xl font-light"
                    onClick={onClose}
                    title="Закрыть">
                    ×
                </button>

                <div className="flex flex-col gap-[1.5rem] items-center w-[80%]">
                    <div className="text-center">
                        <h3 className="text-lg font-semibold">Сохраненные значения</h3>
                        <p className="text-gray-500 text-sm">Выберите значение для вставки</p>
                    </div>

                    <div className="flex flex-col gap-[0.5rem] w-full max-h-[300px] overflow-y-auto">
                        {bufferItems.map((item, index) => (
                            <div key={index} className="group flex items-center gap-[0.5rem]">
                                <Button inverted className="!justify-start flex-1 truncate" onClick={() => onInsert(item)}>
                                    {item}
                                </Button>
                                <button
                                    className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(index);
                                    }}
                                    title="Удалить">
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                    <Button inverted className="!w-[60%]" onClick={onClose}>
                        Вернуться назад
                    </Button>
                </div>
            </div>
        </div>
    );
}
