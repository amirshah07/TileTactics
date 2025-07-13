.PHONY: all build run test clean

# Default target
all: test build

# Build the CLI binary
build:
	go build -o bin/tiletactics cmd/cli/main.go

# Run the CLI
run: build
	./bin/tiletactics

# Run all tests
test:
	go test -v ./...

# Run specific package tests
test-board:
	go test -v ./internal/board/...

test-gaddag:
	go test -v ./internal/gaddag/...

test-generator:
	go test -v ./internal/generator/...

# Run tests with coverage
test-coverage:
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Clean build artifacts
clean:
	rm -rf bin/ coverage.out coverage.html

# Development mode - rebuild and run on changes
# Requires: go install github.com/cosmtrek/air@latest
dev:
	air

# Quick test run without verbose output
quick-test:
	go test ./...

# Benchmark tests
bench:
	go test -bench=. -benchmem ./...