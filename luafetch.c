#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <sys/ioctl.h>
#include <unistd.h>

#include <lua.h>
#include <lualib.h>
#include <lauxlib.h>

static int l_python_write(lua_State *L) {
    const char *str = luaL_checkstring(L, 1);
    fputs(str, stdout);
    return 0;
}

static int l_python_flush(lua_State *L) {
    fflush(stdout);
    return 0;
}

static int l_python_sleep(lua_State *L) {
    double seconds = luaL_checknumber(L, 1);
    struct timespec ts;
    ts.tv_sec = (time_t)seconds;
    ts.tv_nsec = (long)((seconds - ts.tv_sec) * 1e9);
    nanosleep(&ts, NULL);
    return 0;
}

static int l_get_term_size(lua_State *L) {
    int columns = 80;
    int lines = 24;
    struct winsize w;
    if (ioctl(STDOUT_FILENO, TIOCGWINSZ, &w) == 0) {
        columns = w.ws_col;
        lines = w.ws_row;
    }
    lua_pushinteger(L, columns);
    lua_pushinteger(L, lines - 1);
    return 2;
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "[FATAL] Script missing. I'm just a pile of C code without a script... :(\n");
        return 1;
    }
    const char *filename = argv[1];
    const char *dot = strrchr(filename, '.');
    if (!dot || strcmp(dot, ".lua") != 0) {
        fprintf(stderr, "[FATAL] Script missing. I'm just a pile of C code without a script... :(\n");
        return 1;
    }
    lua_State *L = luaL_newstate();
    luaL_openlibs(L);
    lua_register(L, "python_write", l_python_write);
    lua_register(L, "python_flush", l_python_flush);
    lua_register(L, "python_sleep", l_python_sleep);
    lua_register(L, "get_term_size", l_get_term_size);
    if (luaL_dofile(L, filename) != LUA_OK) {
        const char *err = lua_tostring(L, -1);
        fprintf(stderr, "Runtime Error: %s\n", err);
        lua_close(L);
        return 1;
    }
    lua_close(L);
    return 0;
}
