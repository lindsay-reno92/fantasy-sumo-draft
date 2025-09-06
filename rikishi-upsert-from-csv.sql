-- Upsert rikishi from CSV (key: name)
-- Run in Supabase SQL editor

create temporary table _incoming_rikishi (name text primary key,official_rank text,ranking_group text,wins integer,losses integer,absences integer,weight_lbs decimal,height_inches decimal,age decimal,times_picked integer);

insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Onosato', 'Yokozuna 1 East', 'Yellow', 11, 4, 0, 403.3, 75.6, 25.3, 7);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Hoshoryu', 'Yokozuna 1 West', 'Yellow', 1, 4, 10, 328.4, 74, 26.3, 8);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Kotozakura', 'Ozeki 1 East', 'Yellow', 8, 7, 0, 385.7, 74.4, 27.8, 2);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Kirishima', 'Sekiwake 1 West', 'Blue', 8, 7, 0, 319.6, 73.2, 29.4, 6);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Wakatakakage', 'Sekiwake 1 East', 'Blue', 10, 5, 0, 301.9, 72, 30.8, 12);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Aonishiki', 'Komusubi 1 West', 'Blue', 11, 4, 0, 299.7, 71.7, 21.5, 3);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Takayasu', 'Komusubi 1 East', 'Blue', 10, 5, 0, 383.5, 74, 35.5, 4);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Abi', 'Maegashira 1 West', 'Blue', 9, 6, 0, 365.9, 74, 31.4, 0);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Tamawashi', 'Maegashira 1 East', 'Blue', 11, 4, 0, 390.1, 74, 40.8, 0);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Oho', 'Maegashira 2 West', 'Blue', 7, 8, 0, 394.5, 74.8, 25.6, 4);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Hakuoho', 'Maegashira 2 East', 'Blue', 8, 7, 0, 352.6, 71.3, 22.1, 0);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Gonoyama', 'Maegashira 3 West', 'Blue', 9, 6, 0, 352.6, 70.1, 27.4, 2);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Atamifuji', 'Maegashira 3 East', 'Blue', 11, 4, 0, 407.7, 73.2, 23, 2);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Wakamotoharu', 'Maegashira 4 West', 'Blue', 6, 9, 0, 321.8, 73.6, 31.9, 2);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Hiradoumi', 'Maegashira 4 East', 'Blue', 8, 7, 0, 297.5, 70.1, 25.4, 0);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Ichiyamamoto', 'Maegashira 5 West', 'Blue', 9, 6, 0, 337.2, 74, 32, 3);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Kotoshoho', 'Maegashira 5 East', 'Blue', 13, 2, 0, 372.5, 74.8, 26, 1);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Kusano', 'Maegashira 6 West', 'Green', 11, 4, 0, 330.6, 72.4, 24.2, 4);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Onokatsu', 'Maegashira 6 East', 'Green', 6, 9, 0, 359.3, 72.8, 25.4, 1);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Oshoma', 'Maegashira 7 West', 'Green', 3, 12, 0, 363.7, 74.8, 28.4, 3);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Takanosho', 'Maegashira 7 East', 'Green', 9, 6, 0, 374.7, 72.4, 30.8, 3);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Kinbozan', 'Maegashira 8 West', 'Green', 4, 11, 0, 387.9, 76.8, 28.2, 1);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Ura', 'Maegashira 8 East', 'Green', 8, 6, 1, 308.6, 68.9, 33.2, 4);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Fujinokawa', 'Maegashira 9 West', 'Green', 10, 5, 0, 240.2, 68.9, 20.6, 2);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Midorifuji', 'Maegashira 9 East', 'Green', 9, 6, 0, 253.5, 68.5, 29, 3);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Churanoumi', 'Maegashira 10 West', 'Green', 9, 6, 0, 313, 70.1, 32.4, 0);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Daieisho', 'Maegashira 10 East', 'Green', 0, 0, 15, 363.7, 71.7, 31.8, 0);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Roga', 'Maegashira 11 West', 'Green', 7, 8, 0, 346, 72.4, 26.5, 2);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Shodai', 'Maegashira 11 East', 'Green', 9, 6, 0, 379.1, 72.4, 33.9, 0);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Mitakeumi', 'Maegashira 12 West', 'Green', 10, 5, 0, 379.1, 70.5, 32.7, 1);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Takerufuji', 'Maegashira 12 East', 'Green', 5, 8, 2, 326.2, 72.4, 26.4, 6);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Tokihayate', 'Maegashira 13 West', 'Green', 6, 9, 0, 306.4, 70.5, 29.1, 1);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Meisei', 'Maegashira 13 East', 'White', 3, 12, 0, 335, 70.9, 30.1, 1);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Asakoryu', 'Maegashira 14 West', 'White', 6, 9, 0, 271.1, 70.1, 27, 3);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Sadanoumi', 'Maegashira 14 East', 'White', 4, 11, 0, 289.2, 72.4, 38.4, 2);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Shonannoumi', 'Maegashira 15 West', 'White', 0, 0, 0, 403.3, 76.4, 27.4, 0);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Tobizaru', 'Maegashira 15 East', 'White', 3, 10, 2, 295.3, 68.1, 33.4, 1);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Nishikigi', 'Maegashira 16 West', 'White', 0, 0, 0, 409.9, 73.2, 35.1, 0);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Tomokaze', 'Maegashira 16 East', 'White', 0, 0, 0, 370.3, 72, 30.8, 0);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Hitoshi', 'Maegashira 17 West', 'White', 0, 0, 0, 306.4, 71.3, 28.1, 0);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Ryuden', 'Maegashira 17 East', 'White', 0, 0, 0, 348.2, 74.4, 34.8, 0);
insert into _incoming_rikishi (name, official_rank, ranking_group, wins, losses, absences, weight_lbs, height_inches, age, times_picked) values ('Shishi', 'Maegashira 18 East', 'White', 7, 8, 0, 365.9, 76, 28.7, 5);

update rikishi r set official_rank = i.official_rank,ranking_group = i.ranking_group,wins = i.wins,losses = i.losses,absences = i.absences,weight_lbs = i.weight_lbs,height_inches = i.height_inches,age = i.age,times_picked = i.times_picked from _incoming_rikishi i where lower(i.name) = lower(r.name);

insert into rikishi (id, name, official_rank, ranking_group, draft_value, wins, losses, absences, weight_lbs, height_inches, age, times_picked) select (select coalesce(max(id), 0) + row_number() over () from rikishi), i.name, i.official_rank, i.ranking_group, 1, i.wins, i.losses, i.absences, i.weight_lbs, i.height_inches, i.age, i.times_picked from _incoming_rikishi i left join rikishi r on lower(i.name) = lower(r.name) where r.id is null;

drop table _incoming_rikishi;