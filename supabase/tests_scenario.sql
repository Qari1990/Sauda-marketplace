\set ON_ERROR_STOP 0
grant all on all tables in schema public to authenticated; grant select on all tables in schema public to anon;
insert into auth.users values ('00000000-0000-0000-0000-00000000000a','923001111111'),('00000000-0000-0000-0000-00000000000b','923002222222'),('00000000-0000-0000-0000-00000000000c','923003333333');
select id, phone_verified from profiles order by id;
set role authenticated;
set test.uid = '00000000-0000-0000-0000-00000000000a';
update profiles set name='Seller A', deals_completed=99, cnic_verified=true where id=auth.uid();
select name, deals_completed, cnic_verified from profiles where id=auth.uid();
select * from private_contacts; -- expect 0 rows (no policy)
insert into listings (title, category, price, city) values ('Honda CD 70 2023', 'bikes', 150000, 'Lahore') returning id \gset
set test.uid = '00000000-0000-0000-0000-00000000000b';
select amount from make_offer(:'id', 50000, 12); -- too low -> error
select status from make_offer(:'id', 135000, 12);
select status from make_offer(:'id', 136000, 12); -- dup open -> error
select count(*) as b_sees_offers from offers;
set test.uid = '00000000-0000-0000-0000-00000000000c';
select count(*) as c_sees_raw_offers from offers; -- 0
select buyer_label, amount, is_mine from public_offer_board(:'id');
select reveal_phone((select id from deals limit 1)); -- no deal
set test.uid = '00000000-0000-0000-0000-00000000000a';
select respond_offer((select id from offers limit 1), 'counter', 145000) is null as countered;
set test.uid = '00000000-0000-0000-0000-00000000000b';
select price, status from respond_offer((select id from offers limit 1), 'accept_counter');
select d.id as deal from deals d \gset
select reveal_phone(:'deal') as b_sees;
set test.uid = '00000000-0000-0000-0000-00000000000c';
select reveal_phone(:'deal'); -- not your deal
select count(*) c_reveal_log from phone_reveals;
set test.uid = '00000000-0000-0000-0000-00000000000b';
select leave_review(:'deal', 5, 'x'); -- not completed -> error
select confirm_deal(:'deal');
set test.uid = '00000000-0000-0000-0000-00000000000a';
select confirm_deal(:'deal');
select status from deals;
select leave_review(:'deal', 4, 'good buyer');
select leave_review(:'deal', 4, 'again'); -- dup
select name, deals_completed, rating_avg, rating_count from profiles order by id;
select status from listings;
update listings set status='active'; -- sold -> active blocked
select count(*) phone_reveals_seen_by_a from phone_reveals;
