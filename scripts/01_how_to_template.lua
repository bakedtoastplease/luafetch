-- luafetch template.lua
-- Base structure for high-performance console animations

-- 1. INITIALIZATION
math.randomseed(os.time())

-- 2. MAIN LOOP
while true do
    -- Get current terminal size
    local width, height = 80, 24
    if get_term_size then width, height = get_term_size() end
    
    -- Buffer for frame data to prevent flickering
    local buffer = {"\27[H"} 
    
    -- 3. LOGIC & RENDERING
    -- [YOUR CODE HERE]
    
    -- 4. OUTPUT
    python_write(table.concat(buffer))
    python_flush()
    python_sleep(0.03) -- Frame rate control
end
