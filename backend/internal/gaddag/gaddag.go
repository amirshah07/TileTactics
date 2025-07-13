package gaddag

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

const Separator = '>'

type Node struct {
	edges    map[rune]*Node
	terminal bool
}

func NewNode() *Node {
	return &Node{
		edges:    make(map[rune]*Node),
		terminal: false,
	}
}

type GADDAG struct {
	root *Node
}

func New() *GADDAG {
	return &GADDAG{
		root: NewNode(),
	}
}

func (g *GADDAG) Add(word string) {
	if len(word) == 0 {
		return
	}

	word = strings.ToUpper(word)
	runes := []rune(word)

	for i := 0; i <= len(runes); i++ {
		current := g.root

		// Add reversed prefix
		for j := i - 1; j >= 0; j-- {
			letter := runes[j]
			if current.edges[letter] == nil {
				current.edges[letter] = NewNode()
			}
			current = current.edges[letter]
		}

		// Add separator for non-empty prefix
		if i > 0 {
			if current.edges[Separator] == nil {
				current.edges[Separator] = NewNode()
			}
			current = current.edges[Separator]
		}

		// Add suffix
		for j := i; j < len(runes); j++ {
			letter := runes[j]
			if current.edges[letter] == nil {
				current.edges[letter] = NewNode()
			}
			current = current.edges[letter]
		}

		current.terminal = true
	}
}

func (g *GADDAG) Contains(word string) bool {
	word = strings.ToUpper(word)
	runes := []rune(word)

	for i := 0; i <= len(runes); i++ {
		if g.containsPath(runes, i) {
			return true
		}
	}
	return false
}

func (g *GADDAG) containsPath(runes []rune, startPos int) bool {
	current := g.root

	for j := startPos - 1; j >= 0; j-- {
		current = current.edges[runes[j]]
		if current == nil {
			return false
		}
	}

	if startPos > 0 {
		current = current.edges[Separator]
		if current == nil {
			return false
		}
	}

	for j := startPos; j < len(runes); j++ {
		current = current.edges[runes[j]]
		if current == nil {
			return false
		}
	}

	return current.terminal
}

func LoadFromFile(filename string) (*GADDAG, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to open dictionary file: %w", err)
	}
	defer file.Close()

	gaddag := New()
	scanner := bufio.NewScanner(file)
	count := 0

	fmt.Printf("Loading dictionary from %s...\n", filename)

	for scanner.Scan() {
		word := strings.TrimSpace(scanner.Text())
		if word != "" {
			gaddag.Add(word)
			count++
			if count%10000 == 0 {
				fmt.Printf("  Loaded %d words...\n", count)
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading dictionary file: %w", err)
	}

	fmt.Printf("Successfully loaded %d words\n", count)
	return gaddag, nil
}

func (g *GADDAG) Stats() string {
	nodeCount, edgeCount := g.countNodesAndEdges()
	return fmt.Sprintf("GADDAG Stats: %d nodes, %d edges", nodeCount, edgeCount)
}

func (g *GADDAG) countNodesAndEdges() (nodes int, edges int) {
	visited := make(map[*Node]bool)
	g.countHelper(g.root, visited, &nodes, &edges)
	return
}

func (g *GADDAG) countHelper(node *Node, visited map[*Node]bool, nodes *int, edges *int) {
	if visited[node] {
		return
	}
	visited[node] = true
	(*nodes)++

	for _, child := range node.edges {
		(*edges)++
		g.countHelper(child, visited, nodes, edges)
	}
}
