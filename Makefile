all:
	gcc -I/usr/include/lua5.3 -O3 luafetch.c -o luafetch -llua5.3

install:
	install -D -m 0755 luafetch $(DESTDIR)/usr/bin/luafetch

clean:
	rm -f luafetch
