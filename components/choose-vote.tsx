import { Button, Flex, DatePicker, Switch, Callout } from '@tremor/react';
import { MouseEvent, useEffect, useState } from 'react';
import '../app/css/devices.css';
import { Dialog, DialogPanel } from '@tremor/react';

import { RiCloseLine } from '@remixicon/react';

type ActivationResult = {
    status: 'success' | 'error';
    message: string;
    payload?: {
        id: string;
        end_date: Date;
        super_majority: boolean;
        hidden: boolean;
    };
};

interface ModalChooseProps {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    vote: { id: string; title: string };
    index: number;
    onActivate?: (result: ActivationResult) => void;
}

export default function ModalChooseAsCurrent({
    isOpen,
    setIsOpen,
    vote,
    index,
    onActivate
}: ModalChooseProps) {
    const [voteEndDate, setVoteEndDate] = useState<Date | null>(
        new Date(Date.now() + 24 * 60 * 60 * 1000)
    );
    const [feedback, setFeedback] = useState<ActivationResult | null>(null);
    const [isSwitchOn, setIsSwitchOn] = useState(false);
    const [isHiddenSwitchOn, setIsHiddenSwitchOn] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFeedback(null);
            setIsSubmitting(false);
            setVoteEndDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
        }
    }, [isOpen]);

    const handleSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!voteEndDate || voteEndDate.getTime() <= Date.now()) {
            setFeedback({
                status: 'error',
                message: 'Please choose a closing date in the future.'
            });
            return;
        }

        try {
            setIsSubmitting(true);
            const updateData = {
                id: vote.id,
                end_date: voteEndDate,
                super_majority: isSwitchOn,
                hidden: isHiddenSwitchOn
            };
            const response = await fetch('/api/choose-vote', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            setFeedback({
                status: 'success',
                message: 'Vote activated successfully!',
                payload: {
                    id: vote.id,
                    end_date: voteEndDate,
                    super_majority: isSwitchOn,
                    hidden: isHiddenSwitchOn
                }
            });

            onActivate?.({
                status: 'success',
                message: 'Vote activated successfully!',
                payload: {
                    id: vote.id,
                    end_date: voteEndDate,
                    super_majority: isSwitchOn,
                    hidden: isHiddenSwitchOn
                }
            });

            setTimeout(() => {
                setIsOpen(false);
                setFeedback(null);
            }, 1500);
        } catch (error) {
            console.error(error);
            const message = 'Failed to activate vote. Please try again.';
            setFeedback({ status: 'error', message });
            onActivate?.({ status: 'error', message });
        } finally {
            setIsSubmitting(false);
        }
    };
    return (
        <Dialog
            open={isOpen}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onClose={() => setIsOpen(false)}
            static={true}
            className={"z-[" + (200 + 200 * index) + "]"}
        >
            <DialogPanel onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }} className="sm:max-w-5xl bg-gray-900 border border-gray-700">
                <div className="absolute right-0 top-0 pr-3 pt-3">
                    <button
                        type="button"
                        className="rounded-tremor-small p-2 text-tremor-content-subtle hover:bg-tremor-background-subtle hover:text-tremor-content dark:text-dark-tremor-content-subtle hover:dark:bg-dark-tremor-background-subtle hover:dark:text-tremor-content"
                        onClick={() => setIsOpen(false)}
                        aria-label="Close"
                    >
                        <RiCloseLine
                            className="h-5 w-5 shrink-0"
                            aria-hidden={true}
                        />
                    </button>
                </div>
                <form action="#" method="POST">
                    <h4 className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                        Activate voting for: {vote.title}
                    </h4>
                    <p className="mt-2 text-tremor-default leading-6 text-tremor-content dark:text-dark-tremor-content">
                        You can run multiple active FIPs at the same time. Pick a closing date for this proposal and it will go live without affecting other active votes.
                    </p>
                    <DatePicker
                        placeholder='Select the end date'
                        value={voteEndDate ?? undefined}
                        onValueChange={(value) => setVoteEndDate(value ?? null)}
                        minDate={new Date(new Date().getTime() + 24 * 60 * 60 * 1000)}
                    />
                    <Flex flexDirection='row' className='mt-5' alignItems='start' justifyContent='start'>
                        <Switch
                            id="switch"
                            name="switch"
                            className='mr-2'
                            checked={isSwitchOn}
                            onChange={() => setIsSwitchOn(!isSwitchOn)}
                        />
                        <label htmlFor="switch" className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                            Activate{' '}
                            <span className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">super majority (need half the votes + 1)</span>
                        </label>
                    </Flex>
                    <Flex flexDirection='row' className='mt-5' alignItems='start' justifyContent='start'>
                        <Switch
                            id="switch_hidden"
                            name="switch_hidden"
                            className='mr-2'
                            checked={isHiddenSwitchOn}
                            onChange={() => setIsHiddenSwitchOn(!isHiddenSwitchOn)}
                        />
                        <label htmlFor="switch" className="text-tremor-default text-tremor-content dark:text-dark-tremor-content">
                            Activate{' '}
                            <span className="font-medium text-tremor-content-strong dark:text-dark-tremor-content-strong">hidden votes</span>
                        </label>
                    </Flex>
                    <Flex flexDirection='col' className='mt-2' alignItems='start' justifyContent='start'>

                        {feedback && (
                            <Callout
                                className="mt-4 w-full"
                                title={feedback.status === 'success' ? 'Success' : 'Error'}
                                color={feedback.status === 'success' ? 'teal' : 'red'}
                            >
                                {feedback.message}
                            </Callout>
                        )}
                        <div className="w-full flex justify-center"> {/* Container to center the button */}
                            <Button className="mt-2"
                                color='green'
                                size='xl'
                                disabled={isSubmitting}
                                onClick={handleSubmit}
                            >
                                {isSubmitting ? 'Activating...' : 'Activate vote'}
                            </Button>
                        </div>
                    </Flex>
                </form>
            </DialogPanel>
        </Dialog>
    );
}
