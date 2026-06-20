-- =============================================================================
-- DVD BOUNCE EFFECT: A guide to 2D collision physics
-- =============================================================================

while true do
    -- 1. Setup screen and state
    local width, height = get_term_size()
    -- Initialize state globally or outside loop on first run
    if not dvd then
        dvd = {x = 1, y = 1, vx = 2, vy = 1, color = {255, 255, 255}}
    end

    -- 2. Logic: Update position based on velocity (v)
    dvd.x = dvd.x + dvd.vx
    dvd.y = dvd.y + dvd.vy

    -- 3. Collision Detection: Bounce logic
    -- If x hits the wall, invert horizontal velocity (vx = -vx)
    if dvd.x >= width or dvd.x <= 1 then
        dvd.vx = -dvd.vx 
        dvd.color = {math.random(100,255), math.random(100,255), math.random(100,255)}
    end
    -- If y hits the floor/ceiling, invert vertical velocity (vy = -vy)
    if dvd.y >= height or dvd.y <= 1 then
        dvd.vy = -dvd.vy
        dvd.color = {math.random(100,255), math.random(100,255), math.random(100,255)}
    end

    -- 4. Rendering: Use a buffer grid to prevent drawing artifacts
    local grid = {}
    for y = 1, height do
        grid[y] = {}
        for x = 1, width do grid[y][x] = {char = " ", r = 0, g = 0, b = 0} end
    end

    -- Draw the DVD object
    local ix, iy = math.floor(dvd.x), math.floor(dvd.y)
    if ix > 0 and ix <= width and iy > 0 and iy <= height then
        grid[iy][ix] = {char = "DVD", r = dvd.color[1], g = dvd.color[2], b = dvd.color[3]}
    end

    -- Flatten buffer
    local buffer = {"\27[H"}
    for y = 1, height do
        for x = 1, width do
            local c = grid[y][x]
            if c.char ~= " " then
                buffer[#buffer+1] = string.format("\27[38;2;%d;%d;%dm%s", c.r, c.g, c.b, c.char)
            else
                buffer[#buffer+1] = " "
            end
        end
        buffer[#buffer+1] = "\n"
    end

    python_write(table.concat(buffer))
    python_flush()
    python_sleep(0.05)
end
