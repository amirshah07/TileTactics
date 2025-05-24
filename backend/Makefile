.PHONY: run test build-wasm clean

# Run CLI
run:
	go run cmd/cli/main.go

# Run all tests
test:
	go test -v ./...

# Build WASM (for later)
build-wasm:
	GOOS=js GOARCH=wasm go build -ldflags="-s -w" \
		-o ../frontend/public/scrabble.wasm ./cmd/wasm

# Clean build artifacts
clean:
	go clean
	rm -f ../frontend/public/scrabble.wasm

# Format code
fmt:
	go fmt ./...

# Run linter (install: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest)
lint:
	golangci-lint run