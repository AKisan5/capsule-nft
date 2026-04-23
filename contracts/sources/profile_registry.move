module one_capsule::profile_registry {
    use std::string::String;
    use sui::table::{Self, Table};

    // ─── Structs ───────────────────────────────────────────────────────────────

    /// Shared registry: viewer address → Walrus blob ID (encrypted profile).
    public struct ProfileRegistry has key {
        id: UID,
        /// viewer address → Walrus blob ID string
        profiles: Table<address, String>,
    }

    // ─── Initialization ────────────────────────────────────────────────────────

    /// Create the global shared registry.
    /// Call once after package publish: `sui client call ... --function create_registry`.
    public fun create_registry(ctx: &mut TxContext) {
        transfer::share_object(ProfileRegistry {
            id: object::new(ctx),
            profiles: table::new(ctx),
        });
    }

    // ─── Write ─────────────────────────────────────────────────────────────────

    /// Upsert the encrypted-profile blob ID for the calling viewer.
    public fun register_profile(
        registry: &mut ProfileRegistry,
        blob_id: String,
        ctx: &mut TxContext,
    ) {
        let viewer = ctx.sender();
        if (registry.profiles.contains(viewer)) {
            *registry.profiles.borrow_mut(viewer) = blob_id;
        } else {
            registry.profiles.add(viewer, blob_id);
        }
    }

    // ─── Read ──────────────────────────────────────────────────────────────────

    /// Return the blob ID for a viewer, or empty string if not registered.
    public fun get_blob_id(registry: &ProfileRegistry, viewer: address): String {
        if (registry.profiles.contains(viewer)) {
            *registry.profiles.borrow(viewer)
        } else {
            std::string::utf8(b"")
        }
    }

    // ─── Seal access control ───────────────────────────────────────────────────

    /// Called by Seal key servers to verify that the tx sender may decrypt
    /// the profile whose Seal identity is their own address bytes.
    ///
    /// Policy: only the viewer whose address (32-byte BCS encoding) matches `id`
    /// may obtain the decryption key.
    public fun seal_approve(id: vector<u8>, ctx: &TxContext) {
        let sender_bytes = sui::bcs::to_bytes(&ctx.sender());
        assert!(sender_bytes == id, 0);
    }
}
