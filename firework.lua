local math = math
math.randomseed(os.time())

local sparks = {}
-- Жирные символы
local shapes = {'█', '▓'} 

python_write("\27[2J")

while true do
    local width, height = 80, 24
    if get_term_size then width, height = get_term_size() end

    -- Спавн новых частиц
    if #sparks < 8 and math.random() > 0.85 then
        table.insert(sparks, {
            x = math.random(10, width - 10),
            y = height - 2,
            vx = (math.random() - 0.5) * 4,
            vy = - (math.random() * 2.5 + 1.5), -- Высокий прыжок
            gravity = 0.15,
            drag = 0.92, -- Сильная инерция
            life = math.random(10, 80) / 10,
            max_life = 8.0,
            shape = shapes[math.random(#shapes)],
            -- Максимально яркие цвета
            color = {math.random(180, 255), math.random(180, 255), math.random(180, 255)},
            trail = {}
        })
    end

    python_write("\27[2J")

    for i = #sparks, 1, -1 do
        local s = sparks[i]
        
        -- Физика
        s.vx = s.vx * s.drag
        s.vy = s.vy + s.gravity
        s.x = s.x + s.vx
        s.y = s.y + s.vy
        
        -- Отскок
        if s.y >= height - 1 then
            s.y = height - 1
            s.vy = -s.vy * 0.5
        end

        -- Хвост (добавляем новые позиции в начало)
        table.insert(s.trail, 1, {x = s.x, y = s.y})
        if #s.trail > 6 then table.remove(s.trail) end
        
        s.life = s.life - 0.05
        
        -- Рендер
        if s.life > 0 then
            for j = 1, #s.trail do
                local pos = s.trail[j]
                local alpha = (s.life / s.max_life) * (1 - j/8)
                
                if alpha > 0.1 then
                    local r = math.floor(s.color[1] * alpha)
                    local g = math.floor(s.color[2] * alpha)
                    local b = math.floor(s.color[3] * alpha)
                    
                    python_write(string.format("\27[%d;%dH", math.floor(pos.y), math.floor(pos.x)))
                    -- Голова - основная фигура, хвост - жирный блок
                    local char = (j == 1) and s.shape or "█"
                    python_write(string.format("\27[38;2;%d;%d;%dm%s", r, g, b, char))
                end
            end
        else
            table.remove(sparks, i)
        end
    end
    
    python_flush()
    python_sleep(0.03)
end
