module one_capsule::translation_tests {
    use std::string;
    use sui::clock;
    use sui::test_scenario;
    use one_capsule::capsule::{Self, Capsule};
    use one_capsule::translation::{Self};

    // ─── Constants ─────────────────────────────────────────────────────────────

    const CREATOR: address = @0xCAFE;
    const TIMESTAMP_MS: u64 = 1_714_689_600_000;
    const TIMESTAMP_MS_2: u64 = 1_714_693_200_000; // +1h

    // ─── Helpers ────────────────────────────────────────────────────────────────

    fun mint_capsule(scenario: &mut test_scenario::Scenario, clk: &clock::Clock) {
        capsule::mint(
            string::utf8(b"blob_photo"),
            string::utf8(b"highlight"),
            vector[],
            string::utf8(b""),
            string::utf8(b"positive"),
            string::utf8(b"震撼"),
            string::utf8(b"direct"),
            string::utf8(b"原液メモ"),
            string::utf8(b"ONE 170"),
            string::utf8(b"Rodtang"),
            clk,
            test_scenario::ctx(scenario),
        );
    }

    // ─── Tests ─────────────────────────────────────────────────────────────────

    /// 未キャッシュの tier は option::none() を返す
    #[test]
    fun test_get_translation_none_when_empty() {
        let mut scenario = test_scenario::begin(CREATOR);
        let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clk, TIMESTAMP_MS);

        test_scenario::next_tx(&mut scenario, CREATOR);
        mint_capsule(&mut scenario, &clk);

        test_scenario::next_tx(&mut scenario, CREATOR);
        let cap = test_scenario::take_from_sender<Capsule>(&scenario);
        let result = translation::get_translation(&cap, 0);
        assert!(result.is_none(), 0);
        test_scenario::return_to_sender(&scenario, cap);

        clock::destroy_for_testing(clk);
        test_scenario::end(scenario);
    }

    /// cache_translation でキャッシュし、get_translation で取得できる
    #[test]
    fun test_cache_and_get_translation() {
        let mut scenario = test_scenario::begin(CREATOR);
        let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clk, TIMESTAMP_MS);

        test_scenario::next_tx(&mut scenario, CREATOR);
        mint_capsule(&mut scenario, &clk);

        // tier=0 の翻訳をキャッシュ
        test_scenario::next_tx(&mut scenario, CREATOR);
        let mut cap = test_scenario::take_from_sender<Capsule>(&scenario);
        translation::cache_translation(
            &mut cap,
            string::utf8(b"tx_blob_tier0"),
            0, // beginner
            &clk,
        );

        // キャッシュした値を取得して検証
        let result = translation::get_translation(&cap, 0);
        assert!(result.is_some(), 1);
        let t_ref = result.destroy_some();
        assert!(*translation::walrus_blob_id(&t_ref) == string::utf8(b"tx_blob_tier0"), 2);
        assert!(translation::viewer_tier(&t_ref) == 0, 3);
        assert!(translation::generated_at_ms(&t_ref) == TIMESTAMP_MS, 4);

        // tier=1 はまだ none
        assert!(translation::get_translation(&cap, 1).is_none(), 5);

        test_scenario::return_to_sender(&scenario, cap);
        clock::destroy_for_testing(clk);
        test_scenario::end(scenario);
    }

    /// 複数 tier を独立してキャッシュできる
    #[test]
    fun test_multiple_tiers_independent() {
        let mut scenario = test_scenario::begin(CREATOR);
        let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clk, TIMESTAMP_MS);

        test_scenario::next_tx(&mut scenario, CREATOR);
        mint_capsule(&mut scenario, &clk);

        test_scenario::next_tx(&mut scenario, CREATOR);
        let mut cap = test_scenario::take_from_sender<Capsule>(&scenario);

        translation::cache_translation(&mut cap, string::utf8(b"blob_t0"), 0, &clk);
        translation::cache_translation(&mut cap, string::utf8(b"blob_t1"), 1, &clk);
        translation::cache_translation(&mut cap, string::utf8(b"blob_t2"), 2, &clk);

        let r0 = translation::get_translation(&cap, 0).destroy_some();
        let r1 = translation::get_translation(&cap, 1).destroy_some();
        let r2 = translation::get_translation(&cap, 2).destroy_some();

        assert!(*translation::walrus_blob_id(&r0) == string::utf8(b"blob_t0"), 6);
        assert!(*translation::walrus_blob_id(&r1) == string::utf8(b"blob_t1"), 7);
        assert!(*translation::walrus_blob_id(&r2) == string::utf8(b"blob_t2"), 8);
        assert!(translation::viewer_tier(&r0) == 0, 9);
        assert!(translation::viewer_tier(&r1) == 1, 10);
        assert!(translation::viewer_tier(&r2) == 2, 11);

        test_scenario::return_to_sender(&scenario, cap);
        clock::destroy_for_testing(clk);
        test_scenario::end(scenario);
    }

    /// 同 tier を再キャッシュすると最新で上書き (upsert)
    #[test]
    fun test_cache_upsert_same_tier() {
        let mut scenario = test_scenario::begin(CREATOR);
        let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clk, TIMESTAMP_MS);

        test_scenario::next_tx(&mut scenario, CREATOR);
        mint_capsule(&mut scenario, &clk);

        test_scenario::next_tx(&mut scenario, CREATOR);
        let mut cap = test_scenario::take_from_sender<Capsule>(&scenario);

        // 初回キャッシュ (tier=1, t=TIMESTAMP_MS)
        translation::cache_translation(&mut cap, string::utf8(b"blob_v1"), 1, &clk);

        // 時刻を進めて再キャッシュ
        clock::set_for_testing(&mut clk, TIMESTAMP_MS_2);
        translation::cache_translation(&mut cap, string::utf8(b"blob_v2"), 1, &clk);

        let result = translation::get_translation(&cap, 1).destroy_some();
        // 最新の blob_id に更新されている
        assert!(*translation::walrus_blob_id(&result) == string::utf8(b"blob_v2"), 12);
        // 時刻も更新されている
        assert!(translation::generated_at_ms(&result) == TIMESTAMP_MS_2, 13);

        test_scenario::return_to_sender(&scenario, cap);
        clock::destroy_for_testing(clk);
        test_scenario::end(scenario);
    }
}
