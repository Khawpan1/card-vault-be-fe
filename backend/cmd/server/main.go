package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"card-vault/backend/handler"
	"card-vault/backend/store"
)

func main() {
	port := env("PORT", "8080")
	databaseURL := os.Getenv("DATABASE_URL")
	secret := os.Getenv("JWT_SECRET")
	if databaseURL == "" || len(secret) < 32 {
		log.Fatal("DATABASE_URL and a JWT_SECRET of at least 32 characters are required")
	}

	db, err := store.Open(context.Background(), databaseURL)
	if err != nil {
		log.Fatalf("เปิดฐานข้อมูลไม่ได้: %v", err)
	}
	defer db.Close()

	api := handler.New(db, []byte(secret), os.Getenv("FRONTEND_ORIGIN"), os.Getenv("POKEWALLET_API_KEY"))
	server := &http.Server{
		Addr:              ":" + port,
		Handler:           api.Routes(),
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Printf("Vanguard Vault API listening on :%s", port)
	log.Fatal(server.ListenAndServe())
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
