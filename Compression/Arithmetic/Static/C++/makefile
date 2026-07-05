CC ?= cc
CFLAGS ?= -Wall -Wextra -std=c11

.PHONY: all clean

all: compress

compress: main.c encoder.c help.c
	$(CC) $(CFLAGS) -o $@ main.c encoder.c

clean:
	rm -f compress
