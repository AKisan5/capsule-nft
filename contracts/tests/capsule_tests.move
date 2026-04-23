module one_capsule::capsule_tests {
    use std::string;
    use sui::clock;
    use sui::test_scenario;
    use one_capsule::capsule::{Self, Capsule};

    // ─── Constants ─────────────────────────────────────────────────────────────

    const CREATOR: address = @0xCAFE;
    const TIMESTAMP_MS: u64 = 1_714_689_600_000; // 2024-05-03 00:00:00 UTC

    // ─── Helpers ────────────────────────────────────────────────────────────────

    fun do_mint(scenario: &mut test_scenario::Scenario, clk: &clock::Clock) {
        capsule::mint(
            string::utf8(b"walrus_blob_abc123"),
            string::utf8(b"highlight"),
            vector[
                string::utf8(b"KO"),
                string::utf8(b"elbow"),
                string::utf8(b"muay_thai"),
            ],
            string::utf8(b"incredible finish, jaw dropped"),
            string::utf8(b"positive"),
            string::utf8(b"震撼"),
            string::utf8(b"direct"),
            string::utf8(b"心が震えた瞬間、時間が止まった"),
            string::utf8(b"ONE 170: Nieky vs Rodtang"),
            string::utf8(b"Rodtang"),
            clk,
            test_scenario::ctx(scenario),
        );
    }

    // ─── Tests ─────────────────────────────────────────────────────────────────

    /// ミントが成功し、Capsule が creator に転送されることを確認する
    #[test]
    fun test_mint_transfers_to_creator() {
        let mut scenario = test_scenario::begin(CREATOR);

        // Clock を作成して時刻を固定
        let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clk, TIMESTAMP_MS);

        // ミント実行
        test_scenario::next_tx(&mut scenario, CREATOR);
        do_mint(&mut scenario, &clk);

        // CREATOR が Capsule を受け取っていることを確認
        test_scenario::next_tx(&mut scenario, CREATOR);
        assert!(test_scenario::has_most_recent_for_sender<Capsule>(&scenario), 0);

        let cap = test_scenario::take_from_sender<Capsule>(&scenario);
        test_scenario::return_to_sender(&scenario, cap);

        clock::destroy_for_testing(clk);
        test_scenario::end(scenario);
    }

    /// 全フィールドが mint 引数と一致することを確認する
    #[test]
    fun test_mint_fields_integrity() {
        let mut scenario = test_scenario::begin(CREATOR);

        let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clk, TIMESTAMP_MS);

        test_scenario::next_tx(&mut scenario, CREATOR);
        do_mint(&mut scenario, &clk);

        test_scenario::next_tx(&mut scenario, CREATOR);
        let cap = test_scenario::take_from_sender<Capsule>(&scenario);

        // photo_blob_id
        assert!(
            *capsule::photo_blob_id(&cap) == string::utf8(b"walrus_blob_abc123"),
            1,
        );
        // step3_memo (原液)
        assert!(
            *capsule::step3_memo(&cap) == string::utf8(b"心が震えた瞬間、時間が止まった"),
            2,
        );
        // event_name
        assert!(
            *capsule::event_name(&cap) == string::utf8(b"ONE 170: Nieky vs Rodtang"),
            3,
        );
        // fighter_tag
        assert!(
            *capsule::fighter_tag(&cap) == string::utf8(b"Rodtang"),
            4,
        );
        // minted_at_ms が Clock から正しく取得されているか
        assert!(capsule::minted_at_ms(&cap) == TIMESTAMP_MS, 5);
        // creator
        assert!(capsule::creator(&cap) == CREATOR, 6);

        test_scenario::return_to_sender(&scenario, cap);
        clock::destroy_for_testing(clk);
        test_scenario::end(scenario);
    }

    /// 異なる creator 2人がそれぞれ別の Capsule を持つことを確認する
    #[test]
    fun test_mint_multiple_creators_isolated() {
        let creator_a: address = @0xAAAA;
        let creator_b: address = @0xBBBB;

        let mut scenario = test_scenario::begin(creator_a);
        let mut clk = clock::create_for_testing(test_scenario::ctx(&mut scenario));
        clock::set_for_testing(&mut clk, TIMESTAMP_MS);

        // creator_a がミント
        test_scenario::next_tx(&mut scenario, creator_a);
        do_mint(&mut scenario, &clk);

        // creator_b がミント
        test_scenario::next_tx(&mut scenario, creator_b);
        do_mint(&mut scenario, &clk);

        // creator_a のカプセルは creator_a のもの
        test_scenario::next_tx(&mut scenario, creator_a);
        let cap_a = test_scenario::take_from_sender<Capsule>(&scenario);
        assert!(capsule::creator(&cap_a) == creator_a, 10);
        test_scenario::return_to_sender(&scenario, cap_a);

        // creator_b のカプセルは creator_b のもの
        test_scenario::next_tx(&mut scenario, creator_b);
        let cap_b = test_scenario::take_from_sender<Capsule>(&scenario);
        assert!(capsule::creator(&cap_b) == creator_b, 11);
        test_scenario::return_to_sender(&scenario, cap_b);

        clock::destroy_for_testing(clk);
        test_scenario::end(scenario);
    }
}
