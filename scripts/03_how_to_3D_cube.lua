-- luafetch 3D rotating cube
local angle = 0
-- Cube points in 3D space
local points = {{-1,-1,-1}, {1,-1,-1}, {1,1,-1}, {-1,1,-1}, {-1,-1,1}, {1,-1,1}, {1,1,1}, {-1,1,1}}

while true do
    local width, height = get_term_size()
    angle = angle + 0.05
    local s, c = math.sin(angle), math.cos(angle)
    local buffer = {"\27[2J"} -- Clear screen

    for _, p in ipairs(points) do
        -- Rotation matrix (Y and X axis)
        local x, y, z = p[1], p[2], p[3]
        local x1 = x * c - z * s
        local z1 = x * s + z * c
        local y1 = y * c - z1 * s
        
        -- Project 3D to 2D
        local scale = 10
        local sx = math.floor(width/2 + x1 * scale)
        local sy = math.floor(height/2 + y1 * scale / 2) -- /2 for aspect ratio correction
        
        if sx > 1 and sx <= width and sy > 1 and sy <= height then
            buffer[#buffer+1] = string.format("\27[%d;%dH*", sy, sx)
        end
    end

    python_write(table.concat(buffer))
    python_flush()
    python_sleep(0.03)
end
