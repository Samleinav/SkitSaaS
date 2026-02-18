import type { ModuleMessagesByArea } from '../module-messages';

export const moduleMessagesByArea: ModuleMessagesByArea = {
  "global": {
    "en": {
      "mod.commerce.one-time-payments": {
        "products": {
          "common": {
            "providerStripe": "Stripe",
            "providerPayPal": "PayPal"
          },
          "catalog": {
            "eyebrow": "One-time products",
            "title": "Products",
            "description": "Baseline storefront for one-time purchases connected to core checkout.",
            "empty": "No published one-time products are available.",
            "noDescription": "No description.",
            "addToCart": "Add to cart",
            "buyNow": "Buy now"
          },
          "cart": {
            "title": "Cart",
            "missingDescription": "Select a product from the catalog before continuing to order.",
            "browseProducts": "Browse products",
            "eyebrow": "Cart",
            "unitPriceLabel": "Unit price",
            "quantityLabel": "Quantity",
            "totalLabel": "Total",
            "providerLabel": "Provider",
            "continueToOrder": "Continue to order",
            "backToProducts": "Back to products"
          },
          "order": {
            "title": "Order",
            "missingDescription": "Select a product before creating an order.",
            "browseProducts": "Browse products",
            "eyebrow": "Order",
            "description": "This baseline flow creates a module one-time intent and redirects to core checkout.",
            "unitPriceLabel": "Unit price",
            "quantityLabel": "Quantity",
            "totalLabel": "Total",
            "providerLabel": "Provider",
            "targetLabel": "Target",
            "targetTeamLabel": "Team",
            "targetUserLabel": "User",
            "continueToCheckout": "Continue to checkout",
            "backToCart": "Back to cart",
            "oneTimeDescription": "One-time order",
            "switchedToUserWarning": "No team membership found for this account. The checkout target was switched to user automatically.",
            "errors": {
              "target_team_required": "You need an active team membership before starting checkout.",
              "product_not_found": "The selected product was not found.",
              "product_not_published": "The selected product is not published.",
              "product_missing_active_price": "The selected product has no active price.",
              "target_team_forbidden": "You cannot create an order for the selected team.",
              "operation_failed": "Unable to start checkout for this order."
            }
          }
        }
      }
    }
  },
  "dashboard": {
    "en": {
      "mod.example.dashboard": {
        "title": "Example Dashboard",
        "nav": {
          "label": "Example Dashboard"
        }
      }
    },
    "es": {
      "mod.example.dashboard": {
        "title": "Dashboard de Ejemplo",
        "nav": {
          "label": "Dashboard de Ejemplo"
        }
      }
    }
  },
  "admin": {
    "en": {
      "mod.commerce.products": {
        "products": {
          "page": {
            "list": {
              "eyebrow": "Commerce products",
              "title": "Products",
              "description": "Admin management for subscription and one-time catalog products.",
              "createLabel": "Create product",
              "empty": "No products found for current filters."
            },
            "create": {
              "title": "Create Product",
              "description": "Create a catalog product for subscription or one-time checkout.",
              "submitLabel": "Create product",
              "backLabel": "Back"
            },
            "edit": {
              "titlePrefix": "Edit Product #",
              "description": "Update product fields and publication state.",
              "submitLabel": "Save changes",
              "backLabel": "Back"
            },
            "notFound": {
              "title": "Product Not Found",
              "descriptionTemplate": "Product id {productId} was not found.",
              "backLabel": "Back to products"
            }
          },
          "filters": {
            "kindLabel": "Kind",
            "publicationLabel": "Publication",
            "allLabel": "All",
            "subscriptionLabel": "subscription",
            "oneTimeLabel": "one_time",
            "publishedLabel": "published",
            "draftLabel": "draft",
            "applyLabel": "Apply",
            "resetLabel": "Reset"
          },
          "table": {
            "idHeader": "Id",
            "keyHeader": "Key",
            "nameHeader": "Name",
            "kindHeader": "Kind",
            "priceHeader": "Price",
            "stateHeader": "State",
            "updatedHeader": "Updated",
            "actionsHeader": "Actions",
            "editLabel": "Edit",
            "publishLabel": "Publish",
            "unpublishLabel": "Unpublish"
          },
          "form": {
            "productKeyLabel": "Product key",
            "productKeyPlaceholder": "coffee-mug",
            "nameLabel": "Name",
            "descriptionLabel": "Description",
            "kindLabel": "Kind",
            "subscriptionTemplateIdLabel": "Subscription template id",
            "subscriptionTemplateIdHint": "Required only when kind is subscription.",
            "priceCurrencyLabel": "Price currency",
            "priceAmountLabel": "Price amount (cents)",
            "priceProviderLabel": "Price provider",
            "priceProviderPlaceholder": "stripe | paypal",
            "providerPriceIdLabel": "Provider price id"
          },
          "publication": {
            "title": "Publication",
            "currentStateLabel": "Current state"
          },
          "kind": {
            "subscription": "subscription",
            "oneTime": "one_time"
          },
          "state": {
            "published": "published",
            "draft": "draft"
          },
          "feedback": {
            "status": {
              "created": "Product created successfully.",
              "updated": "Product updated successfully.",
              "published": "Product published successfully.",
              "unpublished": "Product unpublished successfully."
            },
            "operationFailedTemplate": "Operation failed ({code}).",
            "errors": {
              "invalid_product_id": "Invalid product id.",
              "invalid_product_key": "Product key is required and must be slug-compatible.",
              "invalid_name": "Product name is required.",
              "invalid_kind": "Product type must be subscription or one_time.",
              "invalid_subscription_template_id": "Subscription template id must be a positive integer.",
              "invalid_price": "Price payload is invalid.",
              "invalid_price_currency": "Price currency must be a valid code.",
              "invalid_price_amount": "Price amount must be an integer >= 0.",
              "invalid_price_provider": "Price provider is invalid.",
              "invalid_price_provider_id": "Provider price id is invalid.",
              "one_time_price_required": "One-time products require an active price.",
              "price_not_allowed_for_subscription": "Price is not allowed for subscription products.",
              "subscription_template_required": "Subscription products require a subscription template id.",
              "subscription_template_not_found": "Subscription template was not found.",
              "subscription_template_not_allowed_for_one_time": "subscriptionTemplateId is not allowed for one_time products.",
              "duplicate_product_key": "Product key is already in use.",
              "one_time_product_missing_active_price": "Cannot publish one_time product without an active price.",
              "no_updates_provided": "No updates were provided.",
              "not_found": "Product was not found.",
              "operation_failed": "Operation failed. Try again."
            }
          }
        }
      },
      "mod.example.admin": {
        "title": "Example Admin",
        "nav": {
          "label": "Example Admin"
        }
      }
    },
    "es": {
      "mod.example.admin": {
        "title": "Admin de Ejemplo",
        "nav": {
          "label": "Admin de Ejemplo"
        }
      }
    }
  },
  "login": {}
};
